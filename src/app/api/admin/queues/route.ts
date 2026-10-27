import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { ApiError } from "@/lib/api/api-error";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { User } from "@/models/user";
import { getEmailQueue, getLeaderboardQueue, getNotificationQueue } from "@/lib/queues/jobs";
import { EmailOutbox } from "@/models/emailOutbox";
import { LeaderboardOutbox } from "@/models/leaderboardOutbox";
import { NotificationOutbox } from "@/models/notificationOutbox";
import { isRedisReady } from "@/lib/redis/client";
import { SCHEDULER_IDS, SCHEDULER_CRONS, SCHEDULER_TIMEZONE } from "@/lib/queues/definitions";

/**
 * Operational endpoint for inspecting queue health and outbox counts.
 * Requires administrator privileges (user.role === "admin" or valid x-admin-key).
 * Ordinary users are rejected with HTTP 403 Forbidden.
 * Never exposes raw tokens, email bodies, passwords, or personal data.
 */
async function handleAdminQueues(
  _req: NextRequest,
  sessionUser: TokenPayload
): Promise<NextResponse> {
  const emailQueue = getEmailQueue();
  const leaderboardQueue = getLeaderboardQueue();
  const notificationQueue = getNotificationQueue();

    // Fetch BullMQ counts
    const [emailCounts, leaderboardCounts, notificationCounts] = await Promise.all([
      emailQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
      leaderboardQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
      notificationQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
    ]);

    // Fetch MongoDB Outbox counts
    const [
      emailPending,
      emailProcessing,
      emailSent,
      emailFailed,
      leaderboardPending,
      leaderboardProcessing,
      leaderboardFailed,
      notificationPending,
      notificationProcessing,
      notificationSent,
      notificationFailed,
      notificationSuppressed,
    ] = await Promise.all([
      EmailOutbox.countDocuments({ status: "pending" }),
      EmailOutbox.countDocuments({ status: "processing" }),
      EmailOutbox.countDocuments({ status: "sent" }),
      EmailOutbox.countDocuments({ status: "failed" }),
      LeaderboardOutbox.countDocuments({ status: "pending" }),
      LeaderboardOutbox.countDocuments({ status: "processing" }),
      LeaderboardOutbox.countDocuments({ status: "failed" }),
      NotificationOutbox.countDocuments({ status: "pending" }),
      NotificationOutbox.countDocuments({ status: "processing" }),
      NotificationOutbox.countDocuments({ status: "sent" }),
      NotificationOutbox.countDocuments({ status: "failed" }),
      NotificationOutbox.countDocuments({ status: "suppressed" }),
    ]);

    const status = {
      redis: {
        isReady: isRedisReady(),
      },
      queues: {
        email: emailCounts,
        leaderboard: leaderboardCounts,
        notifications: notificationCounts,
      },
      outboxes: {
        email: {
          pending: emailPending,
          processing: emailProcessing,
          sent: emailSent,
          failed: emailFailed,
        },
        leaderboard: {
          pending: leaderboardPending,
          processing: leaderboardProcessing,
          failed: leaderboardFailed,
        },
        notifications: {
          pending: notificationPending,
          processing: notificationProcessing,
          sent: notificationSent,
          failed: notificationFailed,
          suppressed: notificationSuppressed,
        },
      },
      schedulers: {
        timezone: SCHEDULER_TIMEZONE,
        registered: [
          {
            id: SCHEDULER_IDS.LEADERBOARD_WEEKLY_FINALIZATION,
            cron: SCHEDULER_CRONS.LEADERBOARD_WEEKLY_FINALIZATION,
          },
          {
            id: SCHEDULER_IDS.LEADERBOARD_OUTBOX_RECOVERY,
            cron: SCHEDULER_CRONS.LEADERBOARD_OUTBOX_RECOVERY,
          },
          {
            id: SCHEDULER_IDS.LEADERBOARD_RECONCILIATION,
            cron: SCHEDULER_CRONS.LEADERBOARD_RECONCILIATION,
          },
          {
            id: SCHEDULER_IDS.EMAIL_OUTBOX_RECOVERY,
            cron: SCHEDULER_CRONS.EMAIL_OUTBOX_RECOVERY,
          },
          {
            id: SCHEDULER_IDS.WELLNESS_CHECK,
            cron: SCHEDULER_CRONS.WELLNESS_CHECK,
          },
          {
            id: SCHEDULER_IDS.NOTIFICATION_OUTBOX_RECOVERY,
            cron: SCHEDULER_CRONS.NOTIFICATION_OUTBOX_RECOVERY,
          },
        ],
      },
      inspectedBy: sessionUser.userId,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(
      new ApiResponse(200, "Queue and background job health retrieved successfully", status),
      { status: 200 }
    );
}

export const GET = withHandler(async (req: NextRequest, ctx: unknown) => {
  // 1. Check if administrative key is provided
  const adminKeyHeader = req.headers.get("x-admin-key");
  const configuredAdminKey = process.env.ADMIN_API_KEY;
  if (configuredAdminKey && adminKeyHeader && adminKeyHeader === configuredAdminKey) {
    return handleAdminQueues(req, {
      userId: "system-admin-key",
      email: "admin@fitpro.local",
      role: "admin",
    });
  }

  // 2. Otherwise require valid authentication and admin role
  return withAuth(async (authReq: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    let isAdmin = sessionUser.role === "admin";
    if (!isAdmin) {
      const dbUser = await User.findById(sessionUser.userId).select("role");
      if (dbUser?.role === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      throw new ApiError(403, "Access denied: Administrator privileges required");
    }

    return handleAdminQueues(authReq, sessionUser);
  })(req, ctx);
});
