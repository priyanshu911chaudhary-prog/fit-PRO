import { Notification, INotification } from "@/models/notification";
import {
  getOrCreateNotificationPreferences,
  INotificationPreferences,
} from "@/models/notificationPreferences";
import { NotificationOutbox } from "@/models/notificationOutbox";
import { PushSubscription } from "@/models/pushSubscription";
import { User } from "@/models/user";
import { WaterLog } from "@/models/waterLog";
import { MealLog } from "@/models/mealLog";
import { WorkoutLog } from "@/models/workoutLog";
import { WorkoutPlan } from "@/models/workoutPlan";
import { resolveUserTargets } from "@/lib/leaderboard/targets";
import { isQualifyingWorkout } from "@/lib/leaderboard/scoring";
import { formatInTimezone, getDayBoundsInTimezone } from "@/lib/timezone";
import {
  evaluateDailyCheckIn,
  evaluateActivityAchievement,
  formatLocalTime,
  getLocalWeekday,
  isQuietHours,
  MAX_EXTERNAL_NOTIFICATIONS_PER_LOCAL_DAY,
  MAX_ACHIEVEMENTS_PER_LOCAL_DAY,
  MAX_PROACTIVE_CHECKINS_PER_LOCAL_DAY,
  ProposedNotification,
} from "./rules";
import { claimNotificationSlot } from "@/models/notificationClaim";
import { sendPushNotification } from "@/lib/push";
import { sendEmail, wellnessEmailTemplate } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { enqueueNotificationDelivery } from "@/lib/queues/jobs";
import { generateUnsubscribeToken } from "./unsubscribe-token";

export class NotificationService {
  /**
   * Processes an activity event (water, meal, workout) to evaluate unlocked milestones.
   */
  static async handleActivityEvent(params: {
    userId: string;
    eventType: "water" | "meal" | "workout";
    logId?: string;
    date?: string;
  }): Promise<INotification | null> {
    const { userId, eventType } = params;
    const preferences = await getOrCreateNotificationPreferences(userId);
    const timezone = preferences.timezone || "Asia/Kolkata";
    const localDate = params.date || formatInTimezone(new Date(), timezone);
    const targets = await resolveUserTargets(userId);

    // Compute verified current activity totals from MongoDB
    const { startOfDay, endOfDay } = getDayBoundsInTimezone(timezone);

    // 1. Cumulative water
    const waterLogs = await WaterLog.find({
      user: userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).select("amountMl date");

    const cumulativeWaterMl = waterLogs
      .filter((w) => formatInTimezone(w.date, timezone) === localDate)
      .reduce((sum, w) => sum + (Number(w.amountMl) || 0), 0);

    // 2. Cumulative protein and meal count
    const mealLogs = await MealLog.find({
      user: userId,
      consumedDate: localDate,
    }).select("totalProtein");

    const cumulativeProteinGrams = mealLogs.reduce(
      (sum, m) => sum + (Number(m.totalProtein) || 0),
      0
    );
    const todayMealCount = mealLogs.length;

    // 3. Workout qualification check
    let isQualifying = false;
    if (eventType === "workout" && params.logId) {
      const workoutLog = await WorkoutLog.findById(params.logId);
      if (workoutLog) {
        isQualifying = isQualifyingWorkout(workoutLog);
      }
    }

    const proposed = evaluateActivityAchievement({
      userId,
      localDate,
      eventType,
      targets,
      activity: {
        cumulativeWaterMl,
        cumulativeProteinGrams,
        todayMealCount,
        isQualifyingWorkout: isQualifying,
      },
      preferences: {
        achievementsEnabled: preferences.achievementsEnabled,
        categories: preferences.categories,
      },
    });

    if (!proposed) {
      return null;
    }

    // Concurrency defense: Atomically claim daily achievement quota slot
    const achievementClaim = await claimNotificationSlot({
      userId,
      localDate,
      claimType: "achievement",
      maxSlots: MAX_ACHIEVEMENTS_PER_LOCAL_DAY,
    });

    if (!achievementClaim.claimed) {
      logger.info("Daily achievement quota already exhausted for user; skipping", {
        userId,
        localDate,
      });
      return null;
    }

    return this.persistAndEnqueueNotification(userId, proposed, preferences, localDate);
  }

  /**
   * Evaluates the scheduled daily check-in for a single user at their scheduled time.
   */
  static async evaluateUserCheckIn(userId: string): Promise<INotification | null> {
    const preferences = await getOrCreateNotificationPreferences(userId);
    if (!preferences.proactiveNudgesEnabled) {
      return null;
    }

    const timezone = preferences.timezone || "Asia/Kolkata";
    const now = new Date();
    const localDate = formatInTimezone(now, timezone);
    const currentTime = formatLocalTime(now, timezone);

    // Check quiet hours
    if (isQuietHours(currentTime, preferences.quietHours)) {
      logger.info("User in quiet hours; skipping daily check-in", { userId, currentTime });
      return null;
    }

    // Check if user already received a check-in today (concurrency defense via unique claim)
    const checkInClaim = await claimNotificationSlot({
      userId,
      localDate,
      claimType: "checkin",
      maxSlots: MAX_PROACTIVE_CHECKINS_PER_LOCAL_DAY,
    });

    if (!checkInClaim.claimed) {
      logger.info("Daily check-in quota already exhausted for user; skipping", {
        userId,
        localDate,
      });
      return null;
    }

    const existingCheckIn = await Notification.findOne({
      user: userId,
      dedupeKey: `${userId}:daily_checkin:${localDate}`,
    });
    if (existingCheckIn) {
      return null;
    }

    const targets = await resolveUserTargets(userId);
    const { startOfDay, endOfDay } = getDayBoundsInTimezone(timezone);

    // Fetch activity for localDate
    const [waterLogs, mealLogs, workoutLogs, activePlan] = await Promise.all([
      WaterLog.find({
        user: userId,
        date: { $gte: startOfDay, $lte: endOfDay },
      }).select("amountMl date"),
      MealLog.find({
        user: userId,
        consumedDate: localDate,
      }).select("totalProtein"),
      WorkoutLog.find({
        user: userId,
        date: localDate,
      }),
      WorkoutPlan.findOne({
        user: userId,
        isActive: true,
      }),
    ]);

    const loggedWaterMl = waterLogs
      .filter((w) => formatInTimezone(w.date, timezone) === localDate)
      .reduce((sum, w) => sum + (Number(w.amountMl) || 0), 0);

    const loggedProteinGrams = mealLogs.reduce(
      (sum, m) => sum + (Number(m.totalProtein) || 0),
      0
    );
    const mealCount = mealLogs.length;

    const hasQualifyingWorkoutToday = workoutLogs.some((w) => isQualifyingWorkout(w));

    // Check scheduled workout in active plan for today's weekday
    const currentWeekday = getLocalWeekday(now, timezone);
    let hasWorkoutScheduledToday = false;
    if (activePlan && Array.isArray(activePlan.schedule)) {
      const scheduledDay = activePlan.schedule.find(
        (s) => s.day?.toLowerCase() === currentWeekday
      );
      if (scheduledDay && Array.isArray(scheduledDay.exercises) && scheduledDay.exercises.length > 0) {
        hasWorkoutScheduledToday = true;
      }
    }

    const proposed = evaluateDailyCheckIn({
      userId,
      localDate,
      currentTime,
      timezone,
      preferences: {
        proactiveNudgesEnabled: preferences.proactiveNudgesEnabled,
        categories: preferences.categories,
        quietHours: preferences.quietHours,
      },
      targets,
      activity: {
        loggedWaterMl,
        loggedProteinGrams,
        mealCount,
        hasQualifyingWorkoutToday,
        hasWorkoutScheduledToday,
      },
      todayNotificationCounts: {
        proactiveCheckIns: 0,
        externalDeliveries: 0,
      },
    });

    if (!proposed) {
      return null;
    }

    return this.persistAndEnqueueNotification(userId, proposed, preferences, localDate);
  }

  /**
   * Persists a validated proposed notification and enqueues external channel deliveries if enabled.
   */
  private static async persistAndEnqueueNotification(
    userId: string,
    proposed: ProposedNotification,
    preferences: INotificationPreferences,
    localDate: string
  ): Promise<INotification | null> {
    let notification: INotification;

    try {
      notification = await Notification.create({
        user: userId,
        type: proposed.type,
        category: proposed.category,
        title: proposed.title,
        body: proposed.body,
        destinationUrl: proposed.destinationUrl,
        metadata: proposed.metadata,
        dedupeKey: proposed.dedupeKey,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiration
      });
    } catch (err: unknown) {
      const mongoError = err as { code?: number };
      if (mongoError?.code === 11000) {
        // Duplicate key: notification was already created by concurrent worker
        logger.info("Notification deduplicated via unique constraint", {
          dedupeKey: proposed.dedupeKey,
        });
        return null;
      }
      throw err;
    }

    // Evaluate external channels (Email, Push)
    const channelsToDeliver: ("email" | "push")[] = [];
    if (preferences.channels.push) channelsToDeliver.push("push");
    if (preferences.channels.email) channelsToDeliver.push("email");

    if (channelsToDeliver.length === 0) {
      return notification;
    }

    // Concurrency defense: Atomically claim external delivery slot
    const externalClaim = await claimNotificationSlot({
      userId,
      localDate,
      claimType: "external_delivery",
      maxSlots: MAX_EXTERNAL_NOTIFICATIONS_PER_LOCAL_DAY,
      notificationId: notification._id.toString(),
    });

    if (!externalClaim.claimed) {
      logger.info("External notification cap reached for user today; keeping in-app only", {
        userId,
        localDate,
      });
      return notification;
    }

    for (const channel of channelsToDeliver) {
      try {
        const outbox = await NotificationOutbox.create({
          notification: notification._id,
          user: userId,
          channel,
          status: "pending",
        });

        await enqueueNotificationDelivery({
          outboxId: outbox._id.toString(),
          notificationId: notification._id.toString(),
          userId,
          channel,
        });
      } catch (error) {
        logger.warn("Failed to create outbox record or enqueue delivery job", {
          notificationId: notification._id,
          channel,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return notification;
  }

  /**
   * Executes channel delivery for a NotificationOutbox record.
   */
  static async deliverOutboxRecord(outboxId: string): Promise<boolean> {
    const outbox = await NotificationOutbox.findById(outboxId);
    if (!outbox || outbox.status === "sent" || outbox.status === "suppressed") {
      return true;
    }

    const notification = await Notification.findById(outbox.notification);
    if (!notification) {
      outbox.status = "failed";
      outbox.lastError = "Notification document not found";
      await outbox.save();
      return false;
    }

    const user = await User.findById(outbox.user);
    if (!user) {
      outbox.status = "failed";
      outbox.lastError = "User not found";
      await outbox.save();
      return false;
    }

    // Verify preferences haven't been revoked
    const preferences = await getOrCreateNotificationPreferences(outbox.user);
    if (
      (outbox.channel === "push" && !preferences.channels.push) ||
      (outbox.channel === "email" && !preferences.channels.email)
    ) {
      outbox.status = "suppressed";
      outbox.lastError = `Channel ${outbox.channel} was disabled by user`;
      await outbox.save();
      return true;
    }

    // Verify category hasn't been disabled
    const categoryKey = notification.category as "hydration" | "workout" | "nutrition";
    if (categoryKey && preferences.categories && preferences.categories[categoryKey] === false) {
      outbox.status = "suppressed";
      outbox.lastError = `Category ${notification.category} was disabled by user`;
      await outbox.save();
      return true;
    }

    // Verify proactive nudges haven't been disabled for nudges
    if (notification.type.includes("nudge") && !preferences.proactiveNudgesEnabled) {
      outbox.status = "suppressed";
      outbox.lastError = "Proactive nudges were disabled by user";
      await outbox.save();
      return true;
    }

    // Check quiet hours at delivery time
    const localTime = formatLocalTime(new Date(), preferences.timezone);
    if (isQuietHours(localTime, preferences.quietHours)) {
      // Delay delivery until quiet hours end
      outbox.nextAttemptAt = new Date(Date.now() + 15 * 60 * 1000); // Check again in 15m
      await outbox.save();
      return false;
    }

    outbox.status = "processing";
    outbox.attempts += 1;
    await outbox.save();

    try {
      if (outbox.channel === "push") {
        const subscriptions = await PushSubscription.find({ user: outbox.user });
        if (subscriptions.length === 0) {
          outbox.status = "suppressed";
          outbox.lastError = "No active Web Push subscriptions found";
          await outbox.save();
          return true;
        }

        for (const sub of subscriptions) {
          await sendPushNotification(sub, {
            title: notification.title,
            body: notification.body,
            url: notification.destinationUrl,
            tag: `fitpro-${notification.category}`,
          });
        }
      } else if (outbox.channel === "email") {
        const env = getEnv();
        const actionUrl = `${env.APP_URL}${notification.destinationUrl}`;
        const preferencesUrl = `${env.APP_URL}/profile#notifications`;
        const unsubscribeToken = await generateUnsubscribeToken(outbox.user.toString());
        const unsubscribeUrl = `${env.APP_URL}/api/notifications/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

        const mailContent = wellnessEmailTemplate(
          user.fullName || "Athlete",
          notification.title,
          notification.body,
          actionUrl,
          preferencesUrl,
          unsubscribeUrl
        );

        await sendEmail({
          email: user.email,
          subject: `Fit-PRO: ${notification.title}`,
          mailgenContent: mailContent,
        });
      }

      outbox.status = "sent";
      outbox.lastError = undefined;
      await outbox.save();
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      outbox.status = "failed";
      outbox.lastError = errorMsg;
      outbox.nextAttemptAt = new Date(Date.now() + Math.min(outbox.attempts * 60 * 1000, 30 * 60 * 1000));
      await outbox.save();
      throw err;
    }
  }

  /**
   * Periodic recovery task that finds pending/retryable NotificationOutbox entries.
   */
  static async recoverPendingOutbox(batchSize = 25): Promise<number> {
    const pendingRecords = await NotificationOutbox.find({
      status: { $in: ["pending", "failed"] },
      attempts: { $lt: 5 },
      nextAttemptAt: { $lte: new Date() },
    })
      .sort({ nextAttemptAt: 1 })
      .limit(batchSize);

    let reEnqueued = 0;
    for (const record of pendingRecords) {
      try {
        await enqueueNotificationDelivery({
          outboxId: record._id.toString(),
          notificationId: record.notification.toString(),
          userId: record.user.toString(),
          channel: record.channel,
        });
        reEnqueued += 1;
      } catch (err) {
        logger.error("Failed to re-enqueue outbox record during recovery sweep", {
          outboxId: record._id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return reEnqueued;
  }
}
