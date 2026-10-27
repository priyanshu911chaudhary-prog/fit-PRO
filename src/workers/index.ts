import { Worker, type ConnectionOptions } from "bullmq";
import mongoose from "mongoose";
import { QUEUE_NAMES } from "@/lib/queues/definitions";
import { createBullMQConnection } from "@/lib/queues/connection";
import { closeQueueConnections } from "@/lib/queues/jobs";
import { emailProcessor } from "./processors/email.processor";
import { leaderboardProcessor } from "./processors/leaderboard.processor";
import { notificationProcessor } from "./processors/notification.processor";
import { registerAllSchedulers, recoverMissedSchedules } from "./schedulers";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface RunningWorkers {
  emailWorker: Worker;
  leaderboardWorker: Worker;
  notificationWorker: Worker;
  shutdown: () => Promise<void>;
}

let isShuttingDown = false;

/**
 * Initializes and starts all BullMQ workers and schedulers.
 */
export async function startWorkers(): Promise<RunningWorkers> {
  logger.info("Initializing Fit-PRO background workers...");

  // 1. Establish database connection
  await connectDB();
  logger.info("MongoDB connected for background workers");

  // 2. Initialize email worker
  const emailConcurrency = Number(process.env.EMAIL_WORKER_CONCURRENCY) || 5;
  const emailWorker = new Worker(QUEUE_NAMES.EMAIL, emailProcessor, {
    connection: createBullMQConnection() as unknown as ConnectionOptions,
    concurrency: emailConcurrency,
  });

  // 3. Initialize leaderboard worker
  const leaderboardConcurrency = Number(process.env.LEADERBOARD_WORKER_CONCURRENCY) || 3;
  const leaderboardWorker = new Worker(QUEUE_NAMES.LEADERBOARD, leaderboardProcessor, {
    connection: createBullMQConnection() as unknown as ConnectionOptions,
    concurrency: leaderboardConcurrency,
  });

  // 4. Initialize notification worker
  const notificationConcurrency = Number(process.env.NOTIFICATION_WORKER_CONCURRENCY) || 3;
  const notificationWorker = new Worker(QUEUE_NAMES.NOTIFICATIONS, notificationProcessor, {
    connection: createBullMQConnection() as unknown as ConnectionOptions,
    concurrency: notificationConcurrency,
  });

  // 5. Attach structured event listeners
  emailWorker.on("completed", (job) => {
    logger.info("Email job completed", {
      event: "job.completed",
      queue: QUEUE_NAMES.EMAIL,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
    });
  });

  emailWorker.on("failed", (job, error) => {
    logger.error("Email job failed", {
      event: "job.failed",
      queue: QUEUE_NAMES.EMAIL,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  });

  emailWorker.on("error", (error) => {
    logger.error("Email worker internal error", {
      event: "worker.error",
      queue: QUEUE_NAMES.EMAIL,
      error: error.message,
    });
  });

  leaderboardWorker.on("completed", (job) => {
    logger.info("Leaderboard job completed", {
      event: "job.completed",
      queue: QUEUE_NAMES.LEADERBOARD,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
    });
  });

  leaderboardWorker.on("failed", (job, error) => {
    logger.error("Leaderboard job failed", {
      event: "job.failed",
      queue: QUEUE_NAMES.LEADERBOARD,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  });

  leaderboardWorker.on("error", (error) => {
    logger.error("Leaderboard worker internal error", {
      event: "worker.error",
      queue: QUEUE_NAMES.LEADERBOARD,
      error: error.message,
    });
  });

  notificationWorker.on("completed", (job) => {
    logger.info("Notification job completed", {
      event: "job.completed",
      queue: QUEUE_NAMES.NOTIFICATIONS,
      jobId: job.id,
      jobName: job.name,
      attemptsMade: job.attemptsMade,
    });
  });

  notificationWorker.on("failed", (job, error) => {
    logger.error("Notification job failed", {
      event: "job.failed",
      queue: QUEUE_NAMES.NOTIFICATIONS,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      error: error.message,
    });
  });

  notificationWorker.on("error", (error) => {
    logger.error("Notification worker internal error", {
      event: "worker.error",
      queue: QUEUE_NAMES.NOTIFICATIONS,
      error: error.message,
    });
  });

  // 6. Register recurring schedulers
  try {
    await registerAllSchedulers();
  } catch (error) {
    logger.error("Failed to register recurring job schedulers", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // 7. Recover missed schedules / drain pending outbox
  try {
    await recoverMissedSchedules();
  } catch (error) {
    logger.error("Failed to execute missed schedule recovery on startup", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  logger.info("Fit-PRO background workers started and listening", {
    emailConcurrency,
    leaderboardConcurrency,
    notificationConcurrency,
  });

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info("Graceful worker shutdown initiated...");

    const shutdownTimeout = setTimeout(() => {
      logger.error("Worker shutdown timed out after 10s; forcing exit");
      process.exit(1);
    }, 10000);

    try {
      await Promise.all([
        emailWorker.close(),
        leaderboardWorker.close(),
        notificationWorker.close(),
      ]);
      await closeQueueConnections();
      await mongoose.disconnect();
      clearTimeout(shutdownTimeout);
      logger.info("Background workers shut down cleanly");
    } catch (err) {
      clearTimeout(shutdownTimeout);
      logger.error("Error during worker shutdown", {
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  return { emailWorker, leaderboardWorker, notificationWorker, shutdown };
}

// Auto-start worker when executed as CLI entrypoint
if (
  require.main === module ||
  process.argv[1]?.endsWith("workers/index.ts") ||
  process.argv[1]?.endsWith("worker.js") ||
  process.argv[1]?.endsWith("worker.cjs")
) {
  startWorkers()
    .then(({ shutdown }) => {
      process.on("SIGINT", async () => {
        await shutdown();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await shutdown();
        process.exit(0);
      });
    })
    .catch((err) => {
      logger.error("Fatal error starting background workers", {
        error: err instanceof Error ? err.message : "Unknown error",
      });
      process.exit(1);
    });
}
