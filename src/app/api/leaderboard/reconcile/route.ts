import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { getCompetitionWeek } from "@/lib/leaderboard/calendar";
import { processLeaderboardOutbox } from "@/lib/leaderboard/recomputation";
import { rebuildRedisLeaderboard } from "@/lib/leaderboard/redis-ranking";

/**
 * Operational reconciliation endpoint.
 * Protected by authentication (withAuth).
 * Drains pending outbox jobs and reconstructs Redis rankings from durable MongoDB records.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    let body: { weekStart?: string; drainOutboxOnly?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // safe fallback if empty body
    }

    const weekStart = body.weekStart || getCompetitionWeek().weekStart;
    const outboxProcessed = await processLeaderboardOutbox(50);

    let indexedCount = 0;
    if (!body.drainOutboxOnly) {
      indexedCount = await rebuildRedisLeaderboard(weekStart);
    }

    return NextResponse.json(
      new ApiResponse(200, "Leaderboard reconciliation completed successfully", {
        weekStart,
        outboxJobsProcessed: outboxProcessed,
        indexedParticipants: indexedCount,
        triggeredBy: sessionUser.userId,
      }),
      { status: 200 }
    );
  })
);
