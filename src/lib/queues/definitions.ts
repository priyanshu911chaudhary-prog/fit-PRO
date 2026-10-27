import { JobsOptions } from "bullmq";

export const QUEUE_NAMES = {
  EMAIL: "email-delivery",
  LEADERBOARD: "leaderboard-maintenance",
  NOTIFICATIONS: "notifications",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const EMAIL_JOBS = {
  SEND_VERIFICATION: "send-verification-email",
  SEND_PASSWORD_RESET: "send-password-reset-email",
  PROCESS_OUTBOX: "process-email-outbox",
} as const;

export type EmailJobName = (typeof EMAIL_JOBS)[keyof typeof EMAIL_JOBS];

export const LEADERBOARD_JOBS = {
  RECALCULATE_USER_SCORE: "recalculate-user-weekly-score",
  PROCESS_OUTBOX: "process-leaderboard-outbox",
  FINALIZE_WEEK: "finalize-competition-week",
  RECONCILE_RANKINGS: "reconcile-redis-rankings",
} as const;

export type LeaderboardJobName = (typeof LEADERBOARD_JOBS)[keyof typeof LEADERBOARD_JOBS];

export const NOTIFICATION_JOBS = {
  EVALUATE_ACTIVITY_EVENT: "evaluate-activity-event",
  SCHEDULED_WELLNESS_CHECK: "scheduled-wellness-check",
  EVALUATE_USER_CHECKIN: "evaluate-user-checkin",
  DELIVER_NOTIFICATION: "deliver-notification",
  RECONCILE_OUTBOX: "reconcile-notification-outbox",
} as const;

export type NotificationJobName = (typeof NOTIFICATION_JOBS)[keyof typeof NOTIFICATION_JOBS];

export const SCHEDULER_IDS = {
  LEADERBOARD_WEEKLY_FINALIZATION: "leaderboard-weekly-finalization",
  LEADERBOARD_OUTBOX_RECOVERY: "leaderboard-outbox-recovery",
  LEADERBOARD_RECONCILIATION: "leaderboard-reconciliation",
  EMAIL_OUTBOX_RECOVERY: "email-outbox-recovery",
  WELLNESS_CHECK: "scheduled-wellness-check",
  NOTIFICATION_OUTBOX_RECOVERY: "reconcile-notification-outbox",
} as const;

export const SCHEDULER_TIMEZONE = "Asia/Kolkata";

export const SCHEDULER_CRONS = {
  LEADERBOARD_WEEKLY_FINALIZATION: "5 0 * * 1", // Monday at 00:05 IST
  LEADERBOARD_OUTBOX_RECOVERY: "*/10 * * * *", // Every 10 minutes
  LEADERBOARD_RECONCILIATION: "*/15 * * * *", // Every 15 minutes
  EMAIL_OUTBOX_RECOVERY: "*/5 * * * *", // Every 5 minutes
  WELLNESS_CHECK: "*/5 * * * *", // Every 5 minutes
  NOTIFICATION_OUTBOX_RECOVERY: "*/5 * * * *", // Every 5 minutes
} as const;

// Typed job payloads
export interface SendEmailJobPayload {
  outboxId: string;
}

export interface ProcessEmailOutboxJobPayload {
  limit?: number;
}

export interface RecalculateUserScoreJobPayload {
  userId: string;
  weekStart?: string;
}

export interface ProcessLeaderboardOutboxJobPayload {
  limit?: number;
}

export interface FinalizeCompetitionWeekJobPayload {
  weekStart?: string;
}

export interface ReconcileRankingsJobPayload {
  weekStart?: string;
}

export interface EvaluateActivityEventJobPayload {
  userId: string;
  eventType: "water" | "meal" | "workout";
  logId?: string;
  date?: string;
}

export interface ScheduledWellnessCheckJobPayload {
  batchSize?: number;
}

export interface EvaluateUserCheckinJobPayload {
  userId: string;
}

export interface DeliverNotificationJobPayload {
  outboxId: string;
  notificationId: string;
  userId: string;
  channel: "email" | "push";
}

export interface ReconcileNotificationOutboxJobPayload {
  limit?: number;
}

// Bounded retry and retention policies
export const DEFAULT_EMAIL_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: {
    count: 500,
    age: 24 * 3600, // 24 hours
  },
  removeOnFail: {
    count: 1000,
    age: 7 * 24 * 3600, // 7 days for troubleshooting
  },
};

export const DEFAULT_LEADERBOARD_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
  removeOnComplete: {
    count: 500,
    age: 24 * 3600,
  },
  removeOnFail: {
    count: 1000,
    age: 7 * 24 * 3600,
  },
};

export const DEFAULT_NOTIFICATION_JOB_OPTS: JobsOptions = {
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
};

export const DEFAULT_MAINTENANCE_JOB_OPTS: JobsOptions = {
  attempts: 2,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
  removeOnComplete: {
    count: 100,
    age: 24 * 3600,
  },
  removeOnFail: {
    count: 500,
    age: 7 * 24 * 3600,
  },
};
