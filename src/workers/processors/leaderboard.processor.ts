import { Job } from "bullmq";
import {
  LEADERBOARD_JOBS,
  RecalculateUserScoreJobPayload,
  ProcessLeaderboardOutboxJobPayload,
  FinalizeCompetitionWeekJobPayload,
  ReconcileRankingsJobPayload,
} from "@/lib/queues/definitions";
import {
  recalculateUserWeeklyScore,
  processLeaderboardOutbox,
  finalizeCompetitionWeek,
} from "@/lib/leaderboard/recomputation";
import { rebuildRedisLeaderboard } from "@/lib/leaderboard/redis-ranking";
import { getCompetitionWeek, getPreviousCompetitionWeek } from "@/lib/leaderboard/calendar";
import { LeaderboardOutbox } from "@/models/leaderboardOutbox";
import { logger } from "@/lib/logger";

/**
 * BullMQ processor for all leaderboard queue jobs.
 */
export async function leaderboardProcessor(
  job: Job<
    | RecalculateUserScoreJobPayload
    | ProcessLeaderboardOutboxJobPayload
    | FinalizeCompetitionWeekJobPayload
    | ReconcileRankingsJobPayload
  >
): Promise<{
  success: boolean;
  jobName: string;
  details?: Record<string, unknown>;
}> {
  const startTime = Date.now();

  logger.info("Leaderboard worker processing job", {
    jobId: job.id,
    jobName: job.name,
    attempt: job.attemptsMade + 1,
  });

  try {
    switch (job.name) {
      case LEADERBOARD_JOBS.RECALCULATE_USER_SCORE: {
        const { userId, weekStart } = job.data as RecalculateUserScoreJobPayload;
        if (!userId) {
          throw new Error("Missing userId in recalculate user score payload");
        }

        await recalculateUserWeeklyScore(userId, weekStart);

        const durationMs = Date.now() - startTime;
        logger.info("User weekly score recalculated successfully", {
          jobId: job.id,
          userId,
          weekStart: weekStart || "current",
          durationMs,
        });

        return {
          success: true,
          jobName: job.name,
          details: { userId, weekStart, durationMs },
        };
      }

      case LEADERBOARD_JOBS.PROCESS_OUTBOX: {
        const { limit } = (job.data as ProcessLeaderboardOutboxJobPayload) || {};

        // Reset stalled "processing" records older than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        await LeaderboardOutbox.updateMany(
          {
            status: "processing",
            updatedAt: { $lt: tenMinutesAgo },
            attempts: { $lt: 5 },
          },
          {
            $set: { status: "pending" },
          }
        ).catch(() => {});

        const processed = await processLeaderboardOutbox(limit || 50);

        // Check for exhausted jobs
        const exhaustedCount = await LeaderboardOutbox.countDocuments({
          status: "failed",
        });

        if (exhaustedCount > 0) {
          logger.warn("Operational alert: permanently failed jobs in LeaderboardOutbox", {
            exhaustedCount,
          });
        }

        const durationMs = Date.now() - startTime;
        logger.info("Leaderboard outbox recovery run completed", {
          jobId: job.id,
          processed,
          exhaustedCount,
          durationMs,
        });

        return {
          success: true,
          jobName: job.name,
          details: { processed, exhaustedCount, durationMs },
        };
      }

      case LEADERBOARD_JOBS.FINALIZE_WEEK: {
        const { weekStart } = (job.data as FinalizeCompetitionWeekJobPayload) || {};
        // If weekStart is not specified, target the previous completed competition week
        const targetWeek =
          weekStart || getPreviousCompetitionWeek(getCompetitionWeek().weekStart).weekStart;

        const finalized = await finalizeCompetitionWeek(targetWeek);
        const durationMs = Date.now() - startTime;

        logger.info("Weekly leaderboard finalization run evaluated", {
          jobId: job.id,
          targetWeek,
          finalized,
          durationMs,
        });

        return {
          success: true,
          jobName: job.name,
          details: { targetWeek, finalized, durationMs },
        };
      }

      case LEADERBOARD_JOBS.RECONCILE_RANKINGS: {
        const { weekStart } = (job.data as ReconcileRankingsJobPayload) || {};
        const targetWeek = weekStart || getCompetitionWeek().weekStart;

        const indexedCount = await rebuildRedisLeaderboard(targetWeek);
        const durationMs = Date.now() - startTime;

        logger.info("Leaderboard Redis rankings reconciled from MongoDB", {
          jobId: job.id,
          targetWeek,
          indexedParticipants: indexedCount,
          durationMs,
        });

        return {
          success: true,
          jobName: job.name,
          details: { targetWeek, indexedParticipants: indexedCount, durationMs },
        };
      }

      default:
        throw new Error(`Unrecognized leaderboard job name: ${job.name}`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;

    logger.error("Failed to process leaderboard job", {
      jobId: job.id,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
      durationMs,
      error: errorMsg,
    });

    throw error;
  }
}
