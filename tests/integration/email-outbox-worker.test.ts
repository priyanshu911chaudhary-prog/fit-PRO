import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import { EmailOutbox } from "@/models/emailOutbox";
import {
  enqueueEmailVerification,
  enqueuePasswordReset,
  getEmailQueue,
  closeQueueConnections,
} from "@/lib/queues/jobs";
import {
  emailProcessor,
  processEmailOutbox,
} from "@/workers/processors/email.processor";
import { EMAIL_JOBS } from "@/lib/queues/definitions";
import * as emailLib from "@/lib/email";
import { connectDB } from "@/lib/db";

describe("Integration: Asynchronous Email Delivery, Outbox Durability & Worker Recovery", () => {
  beforeEach(async () => {
    await connectDB();
    await EmailOutbox.deleteMany({ recipientEmail: /test-email-.*@example\.com/ });
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await EmailOutbox.deleteMany({ recipientEmail: /test-email-.*@example\.com/ });
    await closeQueueConnections();
    vi.restoreAllMocks();
  });

  it("persists outbox record in MongoDB and enqueues job with ONLY outboxId in payload", async () => {
    const testEmail = `test-email-${Date.now()}@example.com`;
    const fullName = "Athlete Tester";
    const secretVerificationLink = "https://example.com/verify-email/unhashed-secret-token-xyz";

    const { outboxId, enqueued } = await enqueueEmailVerification({
      recipientEmail: testEmail,
      fullName,
      verificationLink: secretVerificationLink,
    });

    expect(outboxId).toBeDefined();
    expect(enqueued).toBe(true);

    const outboxDoc = await EmailOutbox.findById(outboxId);
    expect(outboxDoc).not.toBeNull();
    expect(outboxDoc?.recipientEmail).toBe(testEmail);
    expect(outboxDoc?.template).toBe("verification");
    expect(outboxDoc?.status).toBe("pending");

    // Verify secret token is NOT stored as plaintext in MongoDB
    expect(outboxDoc?.encryptedPayload).not.toContain("unhashed-secret-token-xyz");

    // Inspect BullMQ queue job data to ensure raw tokens are NOT in Redis
    const queue = getEmailQueue();
    const job = await queue.getJob(`email-verify-${outboxId}`);
    expect(job).not.toBeNull();
    expect(job?.data).toEqual({ outboxId });
    expect(JSON.stringify(job?.data)).not.toContain("unhashed-secret-token-xyz");
  });

  it("worker successfully processes job, delivers email, and marks outbox record as sent", async () => {
    const testEmail = `test-email-${Date.now()}@example.com`;
    const sendEmailSpy = vi.spyOn(emailLib, "sendEmail").mockResolvedValue({ success: true, messageId: "mt-msg-test-123", simulated: true });

    const { outboxId } = await enqueuePasswordReset({
      recipientEmail: testEmail,
      fullName: "Reset Tester",
      resetLink: "https://example.com/reset-password/reset-token-456",
    });

    const mockJob = {
      id: "job-101",
      name: EMAIL_JOBS.SEND_PASSWORD_RESET,
      data: { outboxId },
      attemptsMade: 0,
    } as any;

    const result = await emailProcessor(mockJob);
    expect(result.success).toBe(true);

    // Verify sendEmail was called with expected decrypted content
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const sendArgs = sendEmailSpy.mock.calls[0][0];
    expect(sendArgs.email).toBe(testEmail);
    expect(sendArgs.subject).toBe("Reset Your Password");

    // Verify outbox status updated to sent
    const updated = await EmailOutbox.findById(outboxId);
    expect(updated?.status).toBe("sent");
    expect(updated?.sentAt).toBeInstanceOf(Date);
    expect(updated?.messageId).toBe("mt-msg-test-123");
    expect(updated?.attempts).toBe(1);
  });

  it("handles provider delivery failure by recording error, setting pending for retry, and throwing for BullMQ backoff", async () => {
    const testEmail = `test-email-${Date.now()}@example.com`;
    vi.spyOn(emailLib, "sendEmail").mockRejectedValue(new Error("Mailtrap API connection timeout"));

    const { outboxId } = await enqueueEmailVerification({
      recipientEmail: testEmail,
      fullName: "Failure Tester",
      verificationLink: "https://example.com/verify-email/test-token",
    });

    const mockJob = {
      id: "job-failure",
      name: EMAIL_JOBS.SEND_VERIFICATION,
      data: { outboxId },
      attemptsMade: 0,
    } as any;

    // Worker should re-throw so BullMQ triggers retry
    await expect(emailProcessor(mockJob)).rejects.toThrow(/Mailtrap API connection timeout/);

    const outboxDoc = await EmailOutbox.findById(outboxId);
    expect(outboxDoc?.status).toBe("pending");
    expect(outboxDoc?.attempts).toBe(1);
    expect(outboxDoc?.lastError).toContain("Mailtrap API connection timeout");
  });

  it("marks outbox record as failed when max attempts are exhausted", async () => {
    const testEmail = `test-email-${Date.now()}@example.com`;
    vi.spyOn(emailLib, "sendEmail").mockRejectedValue(new Error("Permanent mail server rejection"));

    const { outboxId } = await enqueueEmailVerification({
      recipientEmail: testEmail,
      fullName: "Exhausted Tester",
      verificationLink: "https://example.com/verify-email/test-token",
    });

    // Simulate 2 previous attempts already recorded
    await EmailOutbox.updateOne({ _id: outboxId }, { $set: { attempts: 2 } });

    const mockJob = {
      id: "job-exhausted",
      name: EMAIL_JOBS.SEND_VERIFICATION,
      data: { outboxId },
      attemptsMade: 2,
    } as any;

    await expect(emailProcessor(mockJob)).rejects.toThrow();

    const outboxDoc = await EmailOutbox.findById(outboxId);
    expect(outboxDoc?.attempts).toBe(3);
    expect(outboxDoc?.status).toBe("failed");
  });

  it("skips already delivered records idempotently without re-sending", async () => {
    const testEmail = `test-email-${Date.now()}@example.com`;
    const sendEmailSpy = vi.spyOn(emailLib, "sendEmail").mockResolvedValue({ success: true, messageId: "mt-idem-123" });

    const { outboxId } = await enqueueEmailVerification({
      recipientEmail: testEmail,
      fullName: "Idempotent Tester",
      verificationLink: "https://example.com/verify-email/idempotent-token",
    });

    // Mark as sent
    await EmailOutbox.updateOne({ _id: outboxId }, { $set: { status: "sent", sentAt: new Date() } });

    const mockJob = {
      id: "job-duplicate",
      name: EMAIL_JOBS.SEND_VERIFICATION,
      data: { outboxId },
      attemptsMade: 1,
    } as any;

    const result = await emailProcessor(mockJob);
    expect(result.success).toBe(true);
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });

  it("outbox recovery drains pending records in batches", async () => {
    const testEmail = `test-email-${Date.now()}@example.com`;
    vi.spyOn(emailLib, "sendEmail").mockResolvedValue({ success: true, messageId: "mt-batch-123" });

    await enqueueEmailVerification({
      recipientEmail: testEmail,
      fullName: "Batch 1",
      verificationLink: "https://example.com/verify-email/batch-1",
    });

    const drained = await processEmailOutbox(10);
    expect(drained).toBeGreaterThanOrEqual(1);

    const pendingLeft = await EmailOutbox.countDocuments({
      recipientEmail: testEmail,
      status: "pending",
    });
    expect(pendingLeft).toBe(0);
  });
});
