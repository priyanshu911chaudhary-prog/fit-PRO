import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { WaterLog } from "@/models/waterLog";
import { MealLog } from "@/models/mealLog";
import { WorkoutLog } from "@/models/workoutLog";
import { Notification } from "@/models/notification";
import { NotificationOutbox } from "@/models/notificationOutbox";
import { NotificationPreferences } from "@/models/notificationPreferences";
import { NotificationClaim } from "@/models/notificationClaim";
import { NotificationService } from "@/lib/notifications/service";
import { connectDB } from "@/lib/db";
import { closeQueueConnections } from "@/lib/queues/jobs";

describe("Concurrency-Safe Anti-Spam Enforcement", () => {
  let testUserId: mongoose.Types.ObjectId;
  const testLocalDate = "2026-10-27";

  beforeAll(async () => {
    await connectDB();

    const u = await User.create({
      fullName: "Concurrency Athlete",
      email: `concurrency_tester_${Date.now()}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    testUserId = u._id;

    await NotificationPreferences.create({
      user: testUserId,
      timezone: "Asia/Kolkata",
      proactiveNudgesEnabled: true,
      achievementsEnabled: true,
      channels: { inApp: true, email: true, push: true },
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

  it("strictly enforces at most 1 achievement when hydration, protein, and workout events run concurrently", async () => {
    // 1. Prepare data so all 3 milestones qualify simultaneously:
    // Water log > 2500 ml target
    const waterLog = await WaterLog.create({
      user: testUserId,
      amountMl: 2800,
      date: new Date("2026-10-27T10:00:00Z"),
    });

    // Meal log > 140 g target
    await MealLog.create({
      user: testUserId,
      title: "High Protein Lunch",
      consumedDate: testLocalDate,
      totalProtein: 150,
      totalCalories: 800,
      mealType: "lunch",
    });

    // Qualifying workout
    const workoutLog = await WorkoutLog.create({
      user: testUserId,
      title: "Full Body Strength",
      date: testLocalDate,
      totalDuration: 45,
      completionPercentage: 100,
      exercises: [
        {
          exerciseId: new mongoose.Types.ObjectId(),
          sets: 3,
          reps: 10,
          weight: 80,
        },
      ],
    });

    // 2. Fire 3 competing worker calls in parallel
    const [resWater, resMeal, resWorkout] = await Promise.all([
      NotificationService.handleActivityEvent({
        userId: testUserId.toString(),
        eventType: "water",
        logId: waterLog._id.toString(),
        date: testLocalDate,
      }),
      NotificationService.handleActivityEvent({
        userId: testUserId.toString(),
        eventType: "meal",
        date: testLocalDate,
      }),
      NotificationService.handleActivityEvent({
        userId: testUserId.toString(),
        eventType: "workout",
        logId: workoutLog._id.toString(),
        date: testLocalDate,
      }),
    ]);

    // 3. Exactly one worker should return an achievement; the other two must receive null
    const results = [resWater, resMeal, resWorkout].filter(Boolean);
    expect(results.length).toBe(1);

    // 4. Verify MongoDB state: exactly 1 achievement persisted
    const notifications = await Notification.find({ user: testUserId });
    expect(notifications.length).toBe(1);

    // 5. Verify atomic claim document exists
    const claims = await NotificationClaim.find({
      user: testUserId,
      localDate: testLocalDate,
      claimType: "achievement",
    });
    expect(claims.length).toBe(1);
    expect(claims[0].slotNumber).toBe(1);
  });

  it("strictly caps external notifications to at most 2 per local date under concurrent attempts", async () => {
    // Attempt to persist 4 notifications with external channels enabled
    const promises = [1, 2, 3, 4].map((i) =>
      Notification.create({
        user: testUserId,
        type: "custom" as const,
        category: "general",
        title: `Nudge ${i}`,
        body: `Test Nudge Body ${i}`,
        destinationUrl: "/dashboard",
        dedupeKey: `concurrent_test:${testUserId}:${i}:${Date.now()}`,
      })
    );

    const notifications = await Promise.all(promises);

    // Now attempt to enqueue deliveries concurrently for all 4 notifications
    const enqueuePromises = notifications.map(async (n) => {
      // Direct call to claim and create outbox
      const notifId = (n as { _id: mongoose.Types.ObjectId })._id.toString();

      const claim = await (await import("@/models/notificationClaim")).claimNotificationSlot({
        userId: testUserId.toString(),
        localDate: testLocalDate,
        claimType: "external_delivery",
        maxSlots: 2,
        notificationId: notifId,
      });

      if (claim.claimed) {
        await NotificationOutbox.create({
          notification: (n as { _id: mongoose.Types.ObjectId })._id,
          user: testUserId,
          channel: "push",
          status: "pending",
        });
      }
    });

    await Promise.all(enqueuePromises);

    // Verify external outbox records: exactly 2 claimed and created
    const outboxRecords = await NotificationOutbox.find({ user: testUserId });
    expect(outboxRecords.length).toBe(2);

    const claims = await NotificationClaim.find({
      user: testUserId,
      localDate: testLocalDate,
      claimType: "external_delivery",
    });
    expect(claims.length).toBe(2);
  });

  it("does not duplicate when several channels are enabled for one logical notification", async () => {
    const notification = await Notification.create({
      user: testUserId,
      type: "hydration_nudge",
      category: "hydration",
      title: "Drink Water",
      body: "Keep hydrated!",
      destinationUrl: "/water",
      dedupeKey: `multi_channel:${Date.now()}`,
    });

    // Create outbox records for both email and push
    await NotificationOutbox.create([
      { notification: notification._id, user: testUserId, channel: "push", status: "pending" },
      { notification: notification._id, user: testUserId, channel: "email", status: "pending" },
    ]);

    const outboxList = await NotificationOutbox.find({ notification: notification._id });
    expect(outboxList.length).toBe(2);

    const channels = outboxList.map((o) => o.channel).sort();
    expect(channels).toEqual(["email", "push"]);

    // Attempting to create duplicate outbox for same channel violates compound unique index
    let duplicateRejected = false;
    try {
      await NotificationOutbox.create({
        notification: notification._id,
        user: testUserId,
        channel: "email",
        status: "pending",
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000) duplicateRejected = true;
    }
    expect(duplicateRejected).toBe(true);
  });

  it("suppresses delivery if category is disabled after notification was queued", async () => {
    const notification = await Notification.create({
      user: testUserId,
      type: "hydration_nudge",
      category: "hydration",
      title: "Hydration Check-in",
      body: "Log a glass of water!",
      destinationUrl: "/water",
      dedupeKey: `suppress_cat:${Date.now()}`,
    });

    const outbox = await NotificationOutbox.create({
      notification: notification._id,
      user: testUserId,
      channel: "email",
      status: "pending",
    });

    // User disables hydration category
    await NotificationPreferences.updateOne(
      { user: testUserId },
      { $set: { "categories.hydration": false } }
    );

    const deliveryResult = await NotificationService.deliverOutboxRecord(outbox._id.toString());
    expect(deliveryResult).toBe(true);

    const updatedOutbox = await NotificationOutbox.findById(outbox._id);
    expect(updatedOutbox?.status).toBe("suppressed");
    expect(updatedOutbox?.lastError).toContain("Category hydration was disabled");
  });
});
