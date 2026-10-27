import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { NotificationPreferences } from "@/models/notificationPreferences";
import { Notification } from "@/models/notification";
import { NotificationOutbox } from "@/models/notificationOutbox";
import { NotificationService } from "@/lib/notifications/service";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/notifications/unsubscribe-token";
import {
  GET as unsubscribeGetHandler,
  POST as unsubscribePostHandler,
} from "@/app/api/notifications/unsubscribe/route";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { closeQueueConnections } from "@/lib/queues/jobs";

describe("Wellness Email Unsubscribe Mechanism", () => {
  let testUserId: mongoose.Types.ObjectId;
  let testUserEmail: string;

  beforeAll(async () => {
    await connectDB();

    const testId = Date.now();
    testUserEmail = `unsub_athlete_${testId}@fitpro.test`;
    const user = await User.create({
      fullName: "Unsubscribe Athlete",
      email: testUserEmail,
      password: "Password123!",
      isVerified: true,
    });
    testUserId = user._id;

    // Create preferences with email enabled
    await NotificationPreferences.create({
      user: testUserId,
      timezone: "Asia/Kolkata",
      proactiveNudgesEnabled: true,
      channels: { inApp: true, email: true, push: false },
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await User.deleteOne({ _id: testUserId });
      await NotificationPreferences.deleteOne({ user: testUserId });
      await Notification.deleteMany({ user: testUserId });
      await NotificationOutbox.deleteMany({ user: testUserId });
    }
    await closeQueueConnections();
  });

  it("generates a signed, verifiable token without exposing raw user ID", async () => {
    const token = await generateUnsubscribeToken(testUserId.toString());
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Signed JWT format

    const verifiedUserId = await verifyUnsubscribeToken(token);
    expect(verifiedUserId).toBe(testUserId.toString());
  });

  it("safely rejects invalid or tampered unsubscribe tokens with null", async () => {
    const invalidResult = await verifyUnsubscribeToken("invalid.jwt.token");
    expect(invalidResult).toBeNull();

    const emptyResult = await verifyUnsubscribeToken("");
    expect(emptyResult).toBeNull();

    // Tampered token payload
    const token = await generateUnsubscribeToken(testUserId.toString());
    const tampered = token.slice(0, -6) + "abcdef";
    const tamperedResult = await verifyUnsubscribeToken(tampered);
    expect(tamperedResult).toBeNull();
  });

  it("GET endpoint unsubscribes user with valid token and returns confirmation", async () => {
    const token = await generateUnsubscribeToken(testUserId.toString());
    const req = new NextRequest(
      `http://localhost:3000/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      }
    );

    const res = await unsubscribeGetHandler(req, {} as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.statusCode).toBe(200);
    expect(body.data.unsubscribed).toBe(true);

    const updatedPrefs = await NotificationPreferences.findOne({ user: testUserId });
    expect(updatedPrefs?.channels.email).toBe(false);
  });

  it("is idempotent: repeat unsubscribe calls succeed safely", async () => {
    const token = await generateUnsubscribeToken(testUserId.toString());
    const req = new NextRequest(
      `http://localhost:3000/api/notifications/unsubscribe?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      }
    );

    const res = await unsubscribeGetHandler(req, {} as any);
    expect(res.status).toBe(200);

    const updatedPrefs = await NotificationPreferences.findOne({ user: testUserId });
    expect(updatedPrefs?.channels.email).toBe(false);
  });

  it("rejects GET request with invalid token with 400 without leaking user info", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/notifications/unsubscribe?token=malicious_fake_token",
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      }
    );

    const res = await unsubscribeGetHandler(req, {} as any);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.statusCode).toBe(400);
    expect(body.message).toContain("Invalid");
    expect(body.data).toBeNull();
  });

  it("POST endpoint unsubscribes user via JSON body", async () => {
    // Re-enable email first
    await NotificationPreferences.updateOne(
      { user: testUserId },
      { $set: { "channels.email": true } }
    );

    const token = await generateUnsubscribeToken(testUserId.toString());
    const req = new NextRequest("http://localhost:3000/api/notifications/unsubscribe", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const res = await unsubscribePostHandler(req, {} as any);
    expect(res.status).toBe(200);

    const updatedPrefs = await NotificationPreferences.findOne({ user: testUserId });
    expect(updatedPrefs?.channels.email).toBe(false);
  });

  it("immediately suppresses already-queued email jobs when user unsubscribes", async () => {
    // 1. Create a notification and a pending email outbox record
    const notification = await Notification.create({
      user: testUserId,
      type: "hydration_nudge",
      category: "hydration",
      title: "Hydration Reminder",
      body: "Time for a glass of water!",
      destinationUrl: "/water",
      dedupeKey: `queued_test:${Date.now()}`,
    });

    const outbox = await NotificationOutbox.create({
      notification: notification._id,
      user: testUserId,
      channel: "email",
      status: "pending",
    });

    // 2. User unsubscribes
    const token = await generateUnsubscribeToken(testUserId.toString());
    const req = new NextRequest("http://localhost:3000/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    await unsubscribePostHandler(req, {} as any);

    // 3. Worker now attempts to deliver the queued outbox record
    const deliveryResult = await NotificationService.deliverOutboxRecord(outbox._id.toString());
    expect(deliveryResult).toBe(true);

    // 4. Verify outbox record was suppressed and NOT sent
    const updatedOutbox = await NotificationOutbox.findById(outbox._id);
    expect(updatedOutbox?.status).toBe("suppressed");
    expect(updatedOutbox?.lastError).toContain("disabled by user");
  });
});
