import { Job } from "bullmq";
import {
  EMAIL_JOBS,
  SendEmailJobPayload,
  ProcessEmailOutboxJobPayload,
} from "@/lib/queues/definitions";
import { EmailOutbox, IEmailOutbox } from "@/models/emailOutbox";
import { decryptPayload } from "@/lib/email/crypto";
import {
  emailVerificationTemplate,
  passwordResetTemplate,
  sendEmail,
} from "@/lib/email";
import { logger } from "@/lib/logger";

interface DecryptedEmailPayload {
  name: string;
  link: string;
}

/**
 * Delivers a single outbox email record.
 */
async function deliverOutboxRecord(outboxDoc: IEmailOutbox, jobId?: string): Promise<void> {
  const outboxId = outboxDoc._id.toString();

  // Atomically claim the record
  const record = await EmailOutbox.findOneAndUpdate(
    {
      _id: outboxDoc._id,
      status: { $in: ["pending", "processing"] },
    },
    {
      $set: { status: "processing" },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" }
  );

  if (!record) {
    return;
  }

  try {
    const payload = decryptPayload<DecryptedEmailPayload>(record.encryptedPayload);

    let mailgenContent;
    if (record.template === "verification") {
      mailgenContent = emailVerificationTemplate(payload.name, payload.link);
    } else if (record.template === "password-reset") {
      mailgenContent = passwordResetTemplate(payload.name, payload.link);
    } else {
      throw new Error(`Unsupported email template: ${record.template}`);
    }

    await sendEmail({
      email: record.recipientEmail,
      subject: record.subject,
      mailgenContent,
    });

    await EmailOutbox.updateOne(
      { _id: record._id },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          lastError: undefined,
        },
      }
    );

    logger.info("Email successfully dispatched and marked as sent in outbox", {
      jobId,
      outboxId,
      template: record.template,
      attempts: record.attempts,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isExhausted = record.attempts >= record.maxAttempts;

    await EmailOutbox.updateOne(
      { _id: record._id },
      {
        $set: {
          status: isExhausted ? "failed" : "pending",
          lastError: errorMsg,
        },
      }
    );

    logger.error("Failed to process email delivery job", {
      jobId,
      outboxId,
      template: record.template,
      attempts: record.attempts,
      isExhausted,
      error: errorMsg,
    });

    throw error;
  }
}

/**
 * Scans and recovers pending or stalled email outbox records.
 */
export async function processEmailOutbox(limit = 20): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Reset stalled "processing" records back to "pending"
  await EmailOutbox.updateMany(
    {
      status: "processing",
      updatedAt: { $lt: fiveMinutesAgo },
      attempts: { $lt: 3 },
    },
    {
      $set: { status: "pending" },
    }
  );

  const pendingRecords = await EmailOutbox.find({
    status: "pending",
    attempts: { $lt: 3 },
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  let processedCount = 0;
  for (const record of pendingRecords) {
    try {
      await deliverOutboxRecord(record);
      processedCount++;
    } catch {
      // Individual failure logged in deliverOutboxRecord; continue draining batch
    }
  }

  // Count exhausted failures for operational visibility
  const exhaustedCount = await EmailOutbox.countDocuments({
    status: "failed",
  });
  if (exhaustedCount > 0) {
    logger.warn("Operational alert: permanently failed email jobs detected in outbox", {
      exhaustedCount,
    });
  }

  return processedCount;
}

/**
 * BullMQ processor for all email queue jobs.
 */
export async function emailProcessor(
  job: Job<SendEmailJobPayload | ProcessEmailOutboxJobPayload>
): Promise<{ success: boolean; outboxId?: string; processedCount?: number }> {
  logger.info("Email worker processing job", {
    jobId: job.id,
    jobName: job.name,
    attempt: job.attemptsMade + 1,
  });

  if (job.name === EMAIL_JOBS.PROCESS_OUTBOX) {
    const payload = job.data as ProcessEmailOutboxJobPayload;
    const processed = await processEmailOutbox(payload?.limit || 20);
    return { success: true, processedCount: processed };
  }

  const { outboxId } = job.data as SendEmailJobPayload;
  if (!outboxId) {
    throw new Error("Missing outboxId in email job payload");
  }

  const record = await EmailOutbox.findById(outboxId);
  if (!record) {
    logger.warn("Email outbox record not found; skipping job", { jobId: job.id, outboxId });
    return { success: true, outboxId };
  }

  if (record.status === "sent") {
    logger.info("Email outbox record already delivered; skipping duplicate job", {
      jobId: job.id,
      outboxId,
    });
    return { success: true, outboxId };
  }

  await deliverOutboxRecord(record, job.id);
  return { success: true, outboxId };
}
