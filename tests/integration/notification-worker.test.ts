import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { WaterLog } from "@/models/waterLog";
import { MealLog } from "@/models/mealLog";
import { WorkoutLog } from "@/models/workoutLog";
import { Notification } from "@/models/notification";
import { NotificationOutbox } from "@/models/notificationOutbox";
import { NotificationPreferences } from "@/models/notificationPreferences";
import { PushSubscription } from "@/models/pushSubscription";
import { NotificationClaim } from "@/models/notificationClaim";
import { NotificationService } from "@/lib/notifications/service";
import { connectDB } from "@/lib/db";
import { closeQueueConnections } from "@/lib/queues/jobs";

describe("Smart Fitness Nudge Engine — Integration Tests", () => {
  let testUserId: mongoose.Types.ObjectId;
  const testLocalDate = "2026-10-27";

  beforeAll(async () => {
    await connectDB();

    const u = await User.create({
      fullName: "Nudge Athlete",
      email: `nudge_tester_${Date.now()}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    testUserId = u._id;

    // Default test preferences
    await NotificationPreferences.create({
      user: testUserId,
      timezone: "Asia/Kolkata",
      proactiveNudgesEnabled: true,
      achievementsEnabled: true,
      channels: { inApp: true, email: false, push: false },
      quietHours: { enabled: false, start: "21:00", end: "08:00" },
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await User.deleteOne({ _id: testUserId });
      await NotificationPreferences.deleteOne({ user: testUserId });
      await Notification.deleteMany({ user: testUserId });
      await NotificationOutbox.deleteMany({ user: testUserId });
      await NotificationClaim.deleteMany({ user: testUserId });
      await WaterLog.deleteMany({ user: testUserId });
      await MealLog.deleteMany({ user: testUserId });
      await WorkoutLog.deleteMany({ user: testUserId });
      await PushSubscription.deleteMany({ user: testUserId });
    }
    await closeQueueConnections();
  });

  beforeEach(async () => {
    await Notification.deleteMany({ user: testUserId });
    await NotificationOutbox.deleteMany({ user: testUserId });
    await NotificationClaim.deleteMany({ user: testUserId });
    await WaterLog.deleteMany({ user: testUserId });
    await MealLog.deleteMany({ user: testUserId });
    await WorkoutLog.deleteMany({ user: testUserId });
  });

  it("evaluates water activity event and writes milestone achievement to MongoDB", async () => {
    // Default hydration target is 2500 ml. Log 2600 ml.
    const waterLog = await WaterLog.create({
      user: testUserId,
      amountMl: 2600,
      date: new Date("2026-10-27T10:00:00Z"),
    });

    const notification = await NotificationService.handleActivityEvent({
      userId: testUserId.toString(),
      eventType: "water",
      logId: waterLog._id.toString(),
      date: testLocalDate,
    });

    expect(notification).not.toBeNull();
    expect(notification?.type).toBe("hydration_goal");
    expect(notification?.title).toBe("Hydration Goal Reached!");
    expect(notification?.readAt).toBeNull();

    // Verify stored in MongoDB
    const persisted = await Notification.findOne({
      user: testUserId,
      type: "hydration_goal",
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.dedupeKey).toBe(`${testUserId.toString()}:hydration_goal:${testLocalDate}`);
  });

  it("safely deduplicates repeated activity writes without error", async () => {
    const waterLog = await WaterLog.create({
      user: testUserId,
      amountMl: 3000,
      date: new Date("2026-10-27T10:00:00Z"),
    });

    const first = await NotificationService.handleActivityEvent({
      userId: testUserId.toString(),
      eventType: "water",
      logId: waterLog._id.toString(),
      date: testLocalDate,
    });
    expect(first).not.toBeNull();

    // Second write for same day should return null due to dedupeKey
    const second = await NotificationService.handleActivityEvent({
      userId: testUserId.toString(),
      eventType: "water",
      logId: waterLog._id.toString(),
      date: testLocalDate,
    });
    expect(second).toBeNull();

    const count = await Notification.countDocuments({
      user: testUserId,
      dedupeKey: `${testUserId.toString()}:hydration_goal:${testLocalDate}`,
    });
    expect(count).toBe(1);
  });

  it("creates NotificationOutbox records and delivers them when external channels are enabled", async () => {
    // Enable push channel
    await NotificationPreferences.updateOne(
      { user: testUserId },
      { $set: { "channels.push": true } }
    );

    await PushSubscription.create({
      user: testUserId,
      endpoint: `https://fcm.googleapis.com/fcm/send/test-${Date.now()}`,
      keys: { p256dh: "test-p256dh", auth: "test-auth" },
    });

    const waterLog = await WaterLog.create({
      user: testUserId,
      amountMl: 2600,
      date: new Date("2026-10-27T10:00:00Z"),
    });

    const notification = await NotificationService.handleActivityEvent({
      userId: testUserId.toString(),
      eventType: "water",
      logId: waterLog._id.toString(),
      date: testLocalDate,
    });

    expect(notification).not.toBeNull();

    // An outbox record should have been created
    const outbox = await NotificationOutbox.findOne({
      notification: notification!._id,
      channel: "push",
    });
    expect(outbox).not.toBeNull();
    expect(outbox?.status).toBe("pending");

    // Execute delivery
    const deliverySuccess = await NotificationService.deliverOutboxRecord(outbox!._id.toString());
    expect(deliverySuccess).toBe(true);

    const updatedOutbox = await NotificationOutbox.findById(outbox!._id);
    expect(updatedOutbox?.status).toBe("sent");
  });

  it("suppresses delivery if user revoked channel permission prior to delivery", async () => {
    const notification = await Notification.create({
      user: testUserId,
      type: "custom",
      category: "general",
      title: "Test Revocation",
      body: "Testing permission revocation",
      destinationUrl: "/dashboard",
      dedupeKey: `test:revocation:${Date.now()}`,
    });

    const outbox = await NotificationOutbox.create({
      notification: notification._id,
      user: testUserId,
      channel: "email",
      status: "pending",
    });

    // Ensure email is false in preferences
    await NotificationPreferences.updateOne(
      { user: testUserId },
      { $set: { "channels.email": false } }
    );

    const delivered = await NotificationService.deliverOutboxRecord(outbox._id.toString());
    expect(delivered).toBe(true);

    const updatedOutbox = await NotificationOutbox.findById(outbox._id);
    expect(updatedOutbox?.status).toBe("suppressed");
    expect(updatedOutbox?.lastError).toContain("disabled by user");
  });

  it("recovers and re-enqueues pending outbox items via recoverPendingOutbox", async () => {
    const notification = await Notification.create({
      user: testUserId,
      type: "custom",
      category: "general",
      title: "Recovery Test",
      body: "Testing background recovery sweep",
      destinationUrl: "/dashboard",
      dedupeKey: `test:recovery:${Date.now()}`,
    });

    const outbox = await NotificationOutbox.create({
      notification: notification._id,
      user: testUserId,
      channel: "push",
      status: "pending",
      nextAttemptAt: new Date(Date.now() - 5000), // In the past
    });

    const reEnqueued = await NotificationService.recoverPendingOutbox(10);
    expect(reEnqueued).toBeGreaterThanOrEqual(1);

    await NotificationOutbox.deleteOne({ _id: outbox._id });
  });
});
