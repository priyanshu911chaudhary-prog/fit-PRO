import { Queue, type ConnectionOptions } from "bullmq";
import { createBullMQConnection } from "./connection";
import {
  QUEUE_NAMES,
  EMAIL_JOBS,
  LEADERBOARD_JOBS,
  NOTIFICATION_JOBS,
  DEFAULT_EMAIL_JOB_OPTS,
  DEFAULT_LEADERBOARD_JOB_OPTS,
} from "./definitions";
import { EmailOutbox } from "@/models/emailOutbox";
import { LeaderboardOutbox } from "@/models/leaderboardOutbox";
import { encryptPayload } from "@/lib/email/crypto";
import { getCompetitionWeek } from "@/lib/leaderboard/calendar";
import { logger } from "@/lib/logger";

declare global {
  var __fitpro_email_queue__: Queue | undefined;
  var __fitpro_leaderboard_queue__: Queue | undefined;
  var __fitpro_notifications_queue__: Queue | undefined;
}

/**
 * Returns singleton BullMQ Queue for email delivery.
 */
export function getEmailQueue(): Queue {
  if (global.__fitpro_email_queue__) {
    return global.__fitpro_email_queue__;
  }

  const queue = new Queue(QUEUE_NAMES.EMAIL, {
    connection: createBullMQConnection() as unknown as ConnectionOptions,
    defaultJobOptions: DEFAULT_EMAIL_JOB_OPTS,
  });

  global.__fitpro_email_queue__ = queue;
  return queue;
}

/**
 * Returns singleton BullMQ Queue for leaderboard recalculation and maintenance.
 */
export function getLeaderboardQueue(): Queue {
  if (global.__fitpro_leaderboard_queue__) {
    return global.__fitpro_leaderboard_queue__;
  }

  const queue = new Queue(QUEUE_NAMES.LEADERBOARD, {
    connection: createBullMQConnection() as unknown as ConnectionOptions,
    defaultJobOptions: DEFAULT_LEADERBOARD_JOB_OPTS,
  });

  global.__fitpro_leaderboard_queue__ = queue;
  return queue;
}

/**
 * Returns singleton BullMQ Queue for fitness nudges and notifications.
 */
export function getNotificationQueue(): Queue {
  if (global.__fitpro_notifications_queue__) {
    return global.__fitpro_notifications_queue__;
  }

  const queue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
    connection: createBullMQConnection() as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        count: 500,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 1000,
        age: 7 * 24 * 3600,
      },
    },
  });

  global.__fitpro_notifications_queue__ = queue;
  return queue;
}

/**
 * Durably creates an EmailOutbox record and enqueues a verification email job in BullMQ.
 * If Redis is unavailable, the outbox record is safely preserved for background recovery.
 */
export async function enqueueEmailVerification(params: {
  recipientEmail: string;
  fullName: string;
  verificationLink: string;
}): Promise<{ outboxId: string; enqueued: boolean }> {
  const encryptedPayload = encryptPayload({
    name: params.fullName,
    link: params.verificationLink,
  });

  const outbox = await EmailOutbox.create({
    recipientEmail: params.recipientEmail,
    subject: "Verify Your Email Address",
    template: "verification",
    encryptedPayload,
    status: "pending",
  });

  const outboxId = outbox._id.toString();
  let enqueued = false;

  try {
    const queue = getEmailQueue();
    await queue.add(
      EMAIL_JOBS.SEND_VERIFICATION,
      { outboxId },
      {
        jobId: `email:verify:${outboxId}`,
      }
    );
    enqueued = true;
    logger.info("Email verification job enqueued to BullMQ", { outboxId });
  } catch (error) {
    logger.warn("Redis unavailable for immediate email enqueue; preserved in MongoDB outbox", {
      outboxId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return { outboxId, enqueued };
}

/**
 * Durably creates an EmailOutbox record and enqueues a password reset email job in BullMQ.
 * If Redis is unavailable, the outbox record is safely preserved for background recovery.
 */
export async function enqueuePasswordReset(params: {
  recipientEmail: string;
  fullName: string;
  resetLink: string;
}): Promise<{ outboxId: string; enqueued: boolean }> {
  const encryptedPayload = encryptPayload({
    name: params.fullName,
    link: params.resetLink,
  });

  const outbox = await EmailOutbox.create({
    recipientEmail: params.recipientEmail,
    subject: "Reset Your Password",
    template: "password-reset",
    encryptedPayload,
    status: "pending",
  });

  const outboxId = outbox._id.toString();
  let enqueued = false;

  try {
    const queue = getEmailQueue();
    await queue.add(
      EMAIL_JOBS.SEND_PASSWORD_RESET,
      { outboxId },
      {
        jobId: `email:reset:${outboxId}`,
      }
    );
    enqueued = true;
    logger.info("Password reset job enqueued to BullMQ", { outboxId });
  } catch (error) {
    logger.warn("Redis unavailable for immediate email enqueue; preserved in MongoDB outbox", {
      outboxId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return { outboxId, enqueued };
}

/**
 * Enqueues a deduplicated leaderboard recalculation job.
 * If Redis is unavailable, creates a durable MongoDB LeaderboardOutbox entry.
 */
export async function enqueueLeaderboardRecalculation(params: {
  userId: string;
  weekStart?: string;
}): Promise<{ enqueued: boolean; outboxCreated?: boolean }> {
  const weekStart = params.weekStart || getCompetitionWeek().weekStart;
  const userId = params.userId;
  const deterministicJobId = `recalc:${userId}:${weekStart}`;

  try {
    const queue = getLeaderboardQueue();
    await queue.add(
      LEADERBOARD_JOBS.RECALCULATE_USER_SCORE,
      { userId, weekStart },
      {
        jobId: deterministicJobId,
      }
    );
    return { enqueued: true };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // If job already exists in active/waiting state, try a short-delay debounce
    if (errMsg.includes("already exists")) {
      try {
        const queue = getLeaderboardQueue();
        await queue.add(
          LEADERBOARD_JOBS.RECALCULATE_USER_SCORE,
          { userId, weekStart },
          {
            jobId: `${deterministicJobId}:${Date.now()}`,
            delay: 1500,
          }
        );
        return { enqueued: true };
      } catch {
        // Fall back to outbox if secondary enqueue fails
      }
    }

    // Fall back to durable MongoDB LeaderboardOutbox
    logger.warn("Redis unavailable for leaderboard enqueue; saving to MongoDB LeaderboardOutbox", {
      userId,
      weekStart,
      error: errMsg,
    });

    await LeaderboardOutbox.findOneAndUpdate(
      { user: userId, weekStart },
      {
        $setOnInsert: { attempts: 0 },
        $set: {
          lastError: "Enqueued via MongoDB fallback (Redis queue unavailable)",
          status: "pending",
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).catch(() => {});

    return { enqueued: false, outboxCreated: true };
  }
}

/**
 * Enqueues an activity event evaluation job into BullMQ.
 * Deduplicates repeated writes with deterministic job IDs.
 */
export async function enqueueActivityEvaluation(params: {
  userId: string;
  eventType: "water" | "meal" | "workout";
  logId?: string;
  date?: string;
}): Promise<{ enqueued: boolean }> {
  try {
    const queue = getNotificationQueue();
    const jobId = `eval:${params.userId}:${params.eventType}:${params.logId || Date.now()}`;
    await queue.add(
      NOTIFICATION_JOBS.EVALUATE_ACTIVITY_EVENT,
      params,
      { jobId }
    );
    return { enqueued: true };
  } catch (error) {
    logger.warn("Failed to enqueue activity evaluation job", {
      userId: params.userId,
      eventType: params.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
    return { enqueued: false };
  }
}

/**
 * Enqueues a notification channel delivery job into BullMQ.
 */
export async function enqueueNotificationDelivery(params: {
  outboxId: string;
  notificationId: string;
  userId: string;
  channel: "email" | "push";
}): Promise<{ enqueued: boolean }> {
  try {
    const queue = getNotificationQueue();
    await queue.add(
      NOTIFICATION_JOBS.DELIVER_NOTIFICATION,
      params,
      { jobId: `delivery-${params.outboxId}` }
    );
    return { enqueued: true };
  } catch (error) {
    logger.warn("Failed to enqueue notification delivery job", {
      outboxId: params.outboxId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { enqueued: false };
  }
}

/**
 * Closes all queue connections. Useful for graceful shutdown and tests.
 */
export async function closeQueueConnections(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (global.__fitpro_email_queue__) {
    const q = global.__fitpro_email_queue__;
    global.__fitpro_email_queue__ = undefined;
    promises.push(q.close());
  }

  if (global.__fitpro_leaderboard_queue__) {
    const q = global.__fitpro_leaderboard_queue__;
    global.__fitpro_leaderboard_queue__ = undefined;
    promises.push(q.close());
  }

  if (global.__fitpro_notifications_queue__) {
    const q = global.__fitpro_notifications_queue__;
    global.__fitpro_notifications_queue__ = undefined;
    promises.push(q.close());
  }

  await Promise.all(promises);
}
