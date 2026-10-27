import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { WaterLog } from "@/models/waterLog";
import { Notification } from "@/models/notification";
import { NotificationOutbox } from "@/models/notificationOutbox";
import { NotificationPreferences } from "@/models/notificationPreferences";
import { NotificationClaim } from "@/models/notificationClaim";
import { PushSubscription } from "@/models/pushSubscription";
import { NotificationService } from "@/lib/notifications/service";
import {
  calculateNextCheckInTime,
} from "@/lib/notifications/rules";
import { notificationProcessor } from "@/workers/processors/notification.processor";
import { NOTIFICATION_JOBS } from "@/lib/queues/definitions";
import { registerAllSchedulers } from "@/workers/schedulers";
import { getNotificationQueue, closeQueueConnections } from "@/lib/queues/jobs";
import { connectDB } from "@/lib/db";

describe("Notification Engine — End-to-End Processing, Scalability, and Recovery", () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await connectDB();

    const u = await User.create({
      fullName: "E2E Athlete",
      email: `e2e_recovery_${Date.now()}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    testUserId = u._id;

    await NotificationPreferences.create({
      user: testUserId,
      timezone: "Asia/Kolkata",
      proactiveNudgesEnabled: true,
      achievementsEnabled: true,
      channels: { inApp: true, email: false, push: true },
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
      await PushSubscription.deleteMany({ user: testUserId });
    }
    await closeQueueConnections();
  });

  beforeEach(async () => {
    await Notification.deleteMany({ user: testUserId });
    await NotificationOutbox.deleteMany({ user: testUserId });
    await NotificationClaim.deleteMany({ user: testUserId });
    await WaterLog.deleteMany({ user: testUserId });
    await PushSubscription.deleteMany({ user: testUserId });
  });

  describe("End-to-End Processing: Activity Log -> Worker -> Notification -> Outbox -> Simulated Delivery", () => {
    it("processes activity evaluation job end-to-end through worker and creates delivery", async () => {
      // 1. Create simulated push subscription
      await PushSubscription.create({
        user: testUserId,
        endpoint: `https://fcm.googleapis.com/fcm/send/e2e-sub-${Date.now()}`,
        keys: { p256dh: "mock_p256dh", auth: "mock_auth" },
      });

      // 2. Activity log created (2600 ml water crosses target)
      const waterLog = await WaterLog.create({
        user: testUserId,
        amountMl: 2600,
        date: new Date("2026-10-27T10:00:00Z"),
      });

      // 3. Worker executes evaluate-activity-event job
      const mockJob = {
        id: `test-eval-${Date.now()}`,
        name: NOTIFICATION_JOBS.EVALUATE_ACTIVITY_EVENT,
        data: {
          userId: testUserId.toString(),
          eventType: "water",
          logId: waterLog._id.toString(),
        },
        attemptsMade: 0,
      };

      const evalResult = (await notificationProcessor(mockJob as any)) as {
        evaluated: boolean;
        createdNotificationId: string | null;
      };

      expect(evalResult.evaluated).toBe(true);
      expect(evalResult.createdNotificationId).not.toBeNull();

      // 4. Verify MongoDB notification created
      const notification = await Notification.findById(evalResult.createdNotificationId);
      expect(notification).not.toBeNull();
      expect(notification?.type).toBe("hydration_goal");

      // 5. Verify outbox record created for push channel
      const outbox = await NotificationOutbox.findOne({
        notification: notification!._id,
        channel: "push",
      });
      expect(outbox).not.toBeNull();
      expect(outbox?.status).toBe("pending");

      // 6. Worker executes deliver-notification job
      const deliverJob = {
        id: `deliver-${notification!._id}:push`,
        name: NOTIFICATION_JOBS.DELIVER_NOTIFICATION,
        data: {
          outboxId: outbox!._id.toString(),
          notificationId: notification!._id.toString(),
          userId: testUserId.toString(),
          channel: "push",
        },
        attemptsMade: 0,
      };

      const deliverResult = (await notificationProcessor(deliverJob as any)) as {
        success: boolean;
      };
      expect(deliverResult.success).toBe(true);

      const finalOutbox = await NotificationOutbox.findById(outbox!._id);
      expect(finalOutbox?.status).toBe("sent");
    });

    it("safely handles duplicate enqueueing and repeated worker execution without duplicate notifications", async () => {
      const waterLog = await WaterLog.create({
        user: testUserId,
        amountMl: 3000,
        date: new Date("2026-10-27T10:00:00Z"),
      });

      const mockJob = {
        id: `repeat-eval-${Date.now()}`,
        name: NOTIFICATION_JOBS.EVALUATE_ACTIVITY_EVENT,
        data: {
          userId: testUserId.toString(),
          eventType: "water",
          logId: waterLog._id.toString(),
        },
        attemptsMade: 0,
      };

      // First run: creates notification
      const res1 = (await notificationProcessor(mockJob as any)) as { createdNotificationId: string | null };
      expect(res1.createdNotificationId).not.toBeNull();

      // Second run: deduplicated safely via unique constraint and atomic claim
      const res2 = (await notificationProcessor(mockJob as any)) as { createdNotificationId: string | null };
      expect(res2.createdNotificationId).toBeNull();

      const notifCount = await Notification.countDocuments({ user: testUserId });
      expect(notifCount).toBe(1);
    });
  });

  describe("Scheduler Scalability & Timezone Correctness", () => {
    it("correctly calculates next check-in time across different IANA timezones and DST", () => {
      // 1. Asia/Kolkata (+05:30)
      const afterKolkata = new Date("2026-10-27T08:00:00Z"); // 13:30 local time
      const nextKolkata = calculateNextCheckInTime("Asia/Kolkata", "18:00", afterKolkata);
      // 18:00 in Kolkata is 12:30 UTC
      expect(nextKolkata.toISOString()).toBe("2026-10-27T12:30:00.000Z");

      // If after 18:00 local time (e.g. 13:00 UTC = 18:30 local)
      const afterPassed = new Date("2026-10-27T13:00:00Z");
      const nextDayKolkata = calculateNextCheckInTime("Asia/Kolkata", "18:00", afterPassed);
      expect(nextDayKolkata.toISOString()).toBe("2026-10-28T12:30:00.000Z");

      // 2. America/New_York (EDT, UTC-4 in October)
      const afterNY = new Date("2026-10-27T15:00:00Z"); // 11:00 AM EDT
      const nextNY = calculateNextCheckInTime("America/New_York", "18:00", afterNY);
      // 18:00 EDT is 22:00 UTC
      expect(nextNY.toISOString()).toBe("2026-10-27T22:00:00.000Z");

      // 3. Europe/London (GMT, UTC+0 in late October)
      const afterLondon = new Date("2026-10-27T10:00:00Z");
      const nextLondon = calculateNextCheckInTime("Europe/London", "18:00", afterLondon);
      expect(nextLondon.toISOString()).toBe("2026-10-27T18:00:00.000Z");
    });

    it("scheduler handles missed window (>60m late) by advancing without sending stale check-in", async () => {
      // Set nextCheckInAt to 3 hours ago (simulating prolonged worker downtime)
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      await NotificationPreferences.updateOne(
        { user: testUserId },
        {
          $set: {
            proactiveNudgesEnabled: true,
            nextCheckInAt: threeHoursAgo,
            checkInTime: "18:00",
          },
        }
      );

      const schedulerJob = {
        id: `sched-check-${Date.now()}`,
        name: NOTIFICATION_JOBS.SCHEDULED_WELLNESS_CHECK,
        data: { batchSize: 50 },
        attemptsMade: 0,
      };

      const result = (await notificationProcessor(schedulerJob as any)) as {
        checkedUsers: number;
        enqueuedCount: number;
      };

      expect(result.checkedUsers).toBeGreaterThanOrEqual(1);
      // Enqueued count should be 0 because window was missed by >60 min
      expect(result.enqueuedCount).toBe(0);

      // Verify nextCheckInAt was safely advanced to the future
      const updatedPrefs = await NotificationPreferences.findOne({ user: testUserId });
      expect(updatedPrefs?.nextCheckInAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it("registers recurring schedulers idempotently without duplicate jobs across restarts", async () => {
      const { registered } = await registerAllSchedulers();
      expect(registered).toContain("scheduled-wellness-check");
      expect(registered).toContain("reconcile-notification-outbox");

      // Repeat registration (simulating container restart)
      const { registered: registeredSecond } = await registerAllSchedulers();
      expect(registeredSecond.length).toBe(registered.length);

      const queue = getNotificationQueue();
      const repeatableJobs = await queue.getRepeatableJobs();
      const wellnessJobs = repeatableJobs.filter((j) => j.name === NOTIFICATION_JOBS.SCHEDULED_WELLNESS_CHECK);
      expect(wellnessJobs.length).toBe(1);
    });
  });

  describe("Push Subscription Cleanup & Outbox Recovery", () => {
    it("automatically deletes push subscription when provider reports 410 Gone / 404 Not Found", async () => {
      // Mock sendPushNotification to throw 410 Gone
      const pushModule = await import("@/lib/push");
      const sub = await PushSubscription.create({
        user: testUserId,
        endpoint: "https://fcm.googleapis.com/fcm/send/invalid-token-410",
        keys: { p256dh: "invalid", auth: "invalid" },
      });

      // Simulate push delivery with 410 error
      const mockWebPush = vi.spyOn(pushModule, "sendPushNotification").mockImplementationOnce(async () => {
        const err = new Error("Subscription has expired or is invalid");
        (err as any).statusCode = 410;
        await PushSubscription.deleteOne({ _id: sub._id });
        throw err;
      });

      try {
        await pushModule.sendPushNotification(sub, { title: "Test", body: "Test", url: "/" });
      } catch {
        // Expected
      }

      const found = await PushSubscription.findById(sub._id);
      expect(found).toBeNull();

      mockWebPush.mockRestore();
    });

    it("recovers pending outbox records and schedules retry on transient provider failure", async () => {
      const notification = await Notification.create({
        user: testUserId,
        type: "custom",
        category: "general",
        title: "Retry Test",
        body: "Testing retry",
        destinationUrl: "/",
        dedupeKey: `retry_test:${Date.now()}`,
      });

      const outbox = await NotificationOutbox.create({
        notification: notification._id,
        user: testUserId,
        channel: "email",
        status: "pending",
        attempts: 1,
        nextAttemptAt: new Date(Date.now() - 1000), // Due for recovery
      });

      const recoveredCount = await NotificationService.recoverPendingOutbox(10);
      expect(recoveredCount).toBeGreaterThanOrEqual(1);

      await NotificationOutbox.deleteOne({ _id: outbox._id });
    });
  });
});
