import { Job } from "bullmq";
import {
  NOTIFICATION_JOBS,
  EvaluateActivityEventJobPayload,
  ScheduledWellnessCheckJobPayload,
  EvaluateUserCheckinJobPayload,
  DeliverNotificationJobPayload,
  ReconcileNotificationOutboxJobPayload,
} from "@/lib/queues/definitions";
import { NotificationService } from "@/lib/notifications/service";
import { NotificationPreferences } from "@/models/notificationPreferences";
import {
  formatLocalTime,
  isQuietHours,
  calculateNextCheckInTime,
} from "@/lib/notifications/rules";
import { formatInTimezone } from "@/lib/timezone";
import { getNotificationQueue } from "@/lib/queues/jobs";
import { logger } from "@/lib/logger";

/**
 * Worker processor for all notification and smart nudge background jobs.
 */
export async function notificationProcessor(job: Job): Promise<unknown> {
  const startTime = Date.now();
  logger.info("Notification worker processing job", {
    jobId: job.id,
    jobName: job.name,
    attempt: job.attemptsMade + 1,
  });

  try {
    switch (job.name) {
      case NOTIFICATION_JOBS.EVALUATE_ACTIVITY_EVENT: {
        const data = job.data as EvaluateActivityEventJobPayload;
        const result = await NotificationService.handleActivityEvent(data);
        return {
          evaluated: true,
          createdNotificationId: result?._id?.toString() || null,
        };
      }

      case NOTIFICATION_JOBS.SCHEDULED_WELLNESS_CHECK: {
        const data = (job.data || {}) as ScheduledWellnessCheckJobPayload;
        const batchSize = data.batchSize || 100;
        const queue = getNotificationQueue();
        const now = new Date();

        // 1. Query users whose nextCheckInAt is due (indexed compound query)
        const dueUsers = await NotificationPreferences.find({
          proactiveNudgesEnabled: true,
          $or: [
            { nextCheckInAt: { $lte: now } },
            { nextCheckInAt: null },
            { nextCheckInAt: { $exists: false } },
          ],
        })
          .sort({ nextCheckInAt: 1 })
          .select("user timezone checkInTime quietHours nextCheckInAt lastCheckInDate")
          .limit(batchSize);

        let enqueuedCount = 0;

        for (const pref of dueUsers) {
          const timezone = pref.timezone || "Asia/Kolkata";
          const localTime = formatLocalTime(now, timezone);
          const localDate = formatInTimezone(now, timezone);
          const checkInTimeStr = pref.checkInTime || "18:00";

          const nextDue =
            pref.nextCheckInAt ||
            calculateNextCheckInTime(timezone, checkInTimeStr, new Date(now.getTime() - 10 * 60 * 1000));
          const isDue = nextDue.getTime() <= now.getTime();

          // Calculate next scheduled check-in time tomorrow in user's timezone
          const tomorrowCheckIn = calculateNextCheckInTime(
            timezone,
            checkInTimeStr,
            new Date(now.getTime() + 60 * 1000)
          );

          // Optimistically advance nextCheckInAt atomically to prevent duplicate workers
          const updateResult = await NotificationPreferences.updateOne(
            { _id: pref._id, nextCheckInAt: pref.nextCheckInAt },
            { $set: { nextCheckInAt: tomorrowCheckIn, lastCheckInDate: localDate } }
          );

          if (updateResult.modifiedCount === 0 && pref.nextCheckInAt) {
            // Already advanced by another concurrent worker
            continue;
          }

          if (!isDue) {
            continue;
          }

          // Check if check-in was missed due to prolonged downtime (>60 min late)
          const isMissedOutage = now.getTime() - nextDue.getTime() > 60 * 60 * 1000;
          if (isMissedOutage) {
            logger.warn("Scheduled wellness check missed due to prolonged worker downtime; advancing without sending", {
              userId: pref.user.toString(),
              localDate,
              nextDue: nextDue.toISOString(),
            });
            continue;
          }

          // Check quiet hours
          if (isQuietHours(localTime, pref.quietHours)) {
            logger.info("User in quiet hours during due check-in; skipping check-in", {
              userId: pref.user.toString(),
              localTime,
            });
            continue;
          }

          const deterministicJobId = `checkin-${pref.user.toString()}-${localDate}`;
          try {
            await queue.add(
              NOTIFICATION_JOBS.EVALUATE_USER_CHECKIN,
              { userId: pref.user.toString() },
              {
                jobId: deterministicJobId,
                removeOnComplete: true,
              }
            );
            enqueuedCount += 1;
          } catch {
            // Deduplicated or already in queue
          }
        }

        return { checkedUsers: dueUsers.length, enqueuedCount };
      }

      case NOTIFICATION_JOBS.EVALUATE_USER_CHECKIN: {
        const data = job.data as EvaluateUserCheckinJobPayload;
        const result = await NotificationService.evaluateUserCheckIn(data.userId);
        return {
          evaluated: true,
          createdNotificationId: result?._id?.toString() || null,
        };
      }

      case NOTIFICATION_JOBS.DELIVER_NOTIFICATION: {
        const data = job.data as DeliverNotificationJobPayload;
        const success = await NotificationService.deliverOutboxRecord(data.outboxId);
        return { success, outboxId: data.outboxId, channel: data.channel };
      }

      case NOTIFICATION_JOBS.RECONCILE_OUTBOX: {
        const data = (job.data || {}) as ReconcileNotificationOutboxJobPayload;
        const recoveredCount = await NotificationService.recoverPendingOutbox(data.limit || 25);
        return { recoveredCount };
      }

      default:
        logger.warn("Unknown job name received by notification processor", {
          jobName: job.name,
        });
        return { ignored: true };
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error("Failed to process notification job", {
      jobId: job.id,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Checks if currentTime (HH:mm) is within a 15-minute due window of targetTime (HH:mm).
 */
export function isCheckInDue(currentTime: string, targetTime: string): boolean {
  if (!currentTime || !targetTime) return false;
  const [cHour, cMin] = currentTime.split(":").map(Number);
  const [tHour, tMin] = targetTime.split(":").map(Number);

  if (isNaN(cHour) || isNaN(cMin) || isNaN(tHour) || isNaN(tMin)) return false;

  const currentTotalMins = cHour * 60 + cMin;
  const targetTotalMins = tHour * 60 + tMin;

  const diff = currentTotalMins - targetTotalMins;
  // Due if current time is at or within 15 minutes after target time
  return diff >= 0 && diff <= 15;
}
