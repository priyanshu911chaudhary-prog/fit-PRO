
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { WaterLog } from "@/models/waterLog";
import { logWaterSchema } from "@/validators/water.validator";
import { invalidateDashboardCache } from "@/lib/cache/redis-cache";
import { recalculateUserWeeklyScore } from "@/lib/leaderboard/recomputation";

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, logWaterSchema);
    const userId = sessionUser.userId;

    const waterLog = await WaterLog.create({
      user: userId,
      amountMl: body.amountMl,
      date: body.date || new Date(),
    });

    try {
      await invalidateDashboardCache(userId);
    } catch {
      // Safe fallback if Redis is unavailable
    }

    try {
      await recalculateUserWeeklyScore(userId);
    } catch {
      // Safe fallback: failure is queued into LeaderboardOutbox
    }

    return NextResponse.json(
      new ApiResponse(201, "Water intake logged successfully", waterLog),
      { status: 201 }
    );
  })
);

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const logs = await WaterLog.find({ user: sessionUser.userId })
      .sort({ date: -1 })
      .limit(50);

    return NextResponse.json(
      new ApiResponse(200, "Water logs retrieved successfully", logs),
      { status: 200 }
    );
  })
);
