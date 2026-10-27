import {
  EMAIL_JOBS,
  LEADERBOARD_JOBS,
  SCHEDULER_IDS,
  SCHEDULER_CRONS,
  SCHEDULER_TIMEZONE,
  DEFAULT_MAINTENANCE_JOB_OPTS,
} from "@/lib/queues/definitions";
import { getEmailQueue, getLeaderboardQueue } from "@/lib/queues/jobs";
import {
  getCompetitionWeek,
  getPreviousCompetitionWeek,
  getCompetitionWeekUtcBounds,
} from "@/lib/leaderboard/calendar";
import { finalizeCompetitionWeek, processLeaderboardOutbox } from "@/lib/leaderboard/recomputation";
import { processEmailOutbox } from "./processors/email.processor";
import { LeaderboardWeekStatus } from "@/models/leaderboardWeekStatus";
import { logger } from "@/lib/logger";

/**
 * Registers all recurring BullMQ job schedulers idempotently.
 * Uses upsertJobScheduler with deterministic IDs and explicit Asia/Kolkata timezone.
 * Safe across worker restarts and multiple worker/app replicas.
 */
export async function registerAllSchedulers(): Promise<{
  registered: string[];
}> {
  const emailQueue = getEmailQueue();
  const leaderboardQueue = getLeaderboardQueue();
  const registered: string[] = [];

  // 1. Weekly Leaderboard Finalization: Monday at 00:05 in Asia/Kolkata
  await leaderboardQueue.upsertJobScheduler(
    SCHEDULER_IDS.LEADERBOARD_WEEKLY_FINALIZATION,
    {
      pattern: SCHEDULER_CRONS.LEADERBOARD_WEEKLY_FINALIZATION,
      tz: SCHEDULER_TIMEZONE,
    },
    {
      name: LEADERBOARD_JOBS.FINALIZE_WEEK,
      data: {},
      opts: DEFAULT_MAINTENANCE_JOB_OPTS,
    }
  );
  registered.push(SCHEDULER_IDS.LEADERBOARD_WEEKLY_FINALIZATION);

  // 2. Leaderboard Outbox Recovery: Every 10 minutes
  await leaderboardQueue.upsertJobScheduler(
    SCHEDULER_IDS.LEADERBOARD_OUTBOX_RECOVERY,
    {
      pattern: SCHEDULER_CRONS.LEADERBOARD_OUTBOX_RECOVERY,
      tz: SCHEDULER_TIMEZONE,
    },
    {
      name: LEADERBOARD_JOBS.PROCESS_OUTBOX,
      data: { limit: 50 },
      opts: DEFAULT_MAINTENANCE_JOB_OPTS,
    }
  );
  registered.push(SCHEDULER_IDS.LEADERBOARD_OUTBOX_RECOVERY);

  // 3. Leaderboard Redis Rankings Reconciliation: Every 15 minutes
  await leaderboardQueue.upsertJobScheduler(
    SCHEDULER_IDS.LEADERBOARD_RECONCILIATION,
    {
      pattern: SCHEDULER_CRONS.LEADERBOARD_RECONCILIATION,
      tz: SCHEDULER_TIMEZONE,
    },
    {
      name: LEADERBOARD_JOBS.RECONCILE_RANKINGS,
      data: {},
      opts: DEFAULT_MAINTENANCE_JOB_OPTS,
    }
  );
  registered.push(SCHEDULER_IDS.LEADERBOARD_RECONCILIATION);

  // 4. Email Outbox Recovery: Every 5 minutes
  await emailQueue.upsertJobScheduler(
    SCHEDULER_IDS.EMAIL_OUTBOX_RECOVERY,
    {
      pattern: SCHEDULER_CRONS.EMAIL_OUTBOX_RECOVERY,
      tz: SCHEDULER_TIMEZONE,
    },
    {
      name: EMAIL_JOBS.PROCESS_OUTBOX,
      data: { limit: 20 },
      opts: DEFAULT_MAINTENANCE_JOB_OPTS,
    }
  );
  registered.push(SCHEDULER_IDS.EMAIL_OUTBOX_RECOVERY);

  // 5. Scheduled Wellness Check-in: Every 5 minutes
  const { getNotificationQueue } = await import("@/lib/queues/jobs");
  const notificationQueue = getNotificationQueue();
  const { NOTIFICATION_JOBS } = await import("@/lib/queues/definitions");

  await notificationQueue.upsertJobScheduler(
    SCHEDULER_IDS.WELLNESS_CHECK,
    {
      pattern: SCHEDULER_CRONS.WELLNESS_CHECK,
      tz: SCHEDULER_TIMEZONE,
    },
    {
      name: NOTIFICATION_JOBS.SCHEDULED_WELLNESS_CHECK,
      data: { batchSize: 100 },
      opts: DEFAULT_MAINTENANCE_JOB_OPTS,
    }
  );
  registered.push(SCHEDULER_IDS.WELLNESS_CHECK);

  // 6. Notification Outbox Recovery: Every 5 minutes
  await notificationQueue.upsertJobScheduler(
    SCHEDULER_IDS.NOTIFICATION_OUTBOX_RECOVERY,
    {
      pattern: SCHEDULER_CRONS.NOTIFICATION_OUTBOX_RECOVERY,
      tz: SCHEDULER_TIMEZONE,
    },
    {
      name: NOTIFICATION_JOBS.RECONCILE_OUTBOX,
      data: { limit: 25 },
      opts: DEFAULT_MAINTENANCE_JOB_OPTS,
    }
  );
  registered.push(SCHEDULER_IDS.NOTIFICATION_OUTBOX_RECOVERY);

  logger.info("All BullMQ recurring job schedulers registered successfully", {
    timezone: SCHEDULER_TIMEZONE,
    schedulers: registered,
  });

  return { registered };
}

/**
 * Checks for and recovers missed schedules after worker/redis downtime or restarts.
 * Ensures completed competition weeks are finalized even if downtime occurred during Monday 00:05.
 */
export async function recoverMissedSchedules(): Promise<{
  missedFinalizationChecked: boolean;
  finalizedPreviousWeek: boolean;
  outboxDrained: number;
  emailOutboxDrained: number;
}> {
  logger.info("Evaluating missed schedules and pending recovery work...");

  let finalizedPreviousWeek = false;

  try {
    const currentWeek = getCompetitionWeek();
    const previousWeek = getPreviousCompetitionWeek(currentWeek.weekStart);
    const { endUtc } = getCompetitionWeekUtcBounds(previousWeek.weekStart);

    // If scoring period for previous week has ended
    if (new Date() >= endUtc) {
      const statusDoc = await LeaderboardWeekStatus.findOne({
        weekStart: previousWeek.weekStart,
      });

      if (!statusDoc?.isFinalized) {
        logger.info("Detected unfinalized previous competition week on startup; executing finalization", {
          weekStart: previousWeek.weekStart,
        });
        finalizedPreviousWeek = await finalizeCompetitionWeek(previousWeek.weekStart);
      }
    }
  } catch (error) {
    logger.error("Error during startup missed finalization recovery", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Drain any pending outbox items left from downtime
  let outboxDrained = 0;
  let emailOutboxDrained = 0;

  try {
    outboxDrained = await processLeaderboardOutbox(50);
  } catch (error) {
    logger.error("Error during startup leaderboard outbox drain", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  try {
    emailOutboxDrained = await processEmailOutbox(20);
  } catch (error) {
    logger.error("Error during startup email outbox drain", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  let notificationOutboxDrained = 0;
  try {
    const { NotificationService } = await import("@/lib/notifications/service");
    notificationOutboxDrained = await NotificationService.recoverPendingOutbox(25);
  } catch (error) {
    logger.error("Error during startup notification outbox drain", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  logger.info("Startup recovery sweep completed", {
    finalizedPreviousWeek,
    outboxDrained,
    emailOutboxDrained,
    notificationOutboxDrained,
  });

  return {
    missedFinalizationChecked: true,
    finalizedPreviousWeek,
    outboxDrained,
    emailOutboxDrained,
  };
}
