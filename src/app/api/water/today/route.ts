
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { formatInTimezone, getUserTimezone } from "@/lib/timezone";
import { WaterLog } from "@/models/waterLog";
import { resolveUserTargets, DEFAULT_HYDRATION_TARGET_ML } from "@/lib/leaderboard/targets";

export const GET = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;
    const timeZone = getUserTimezone(req);
    const todayStr = formatInTimezone(new Date(), timeZone);

    const [recentLogs, targets] = await Promise.all([
      WaterLog.find({ user: userId }).sort({ createdAt: -1, date: -1 }).limit(100),
      resolveUserTargets(userId).catch(() => ({ dailyHydrationTarget: DEFAULT_HYDRATION_TARGET_ML })),
    ]);

    // Filter logs that match today's date in user's timezone (Approved Fix 7)
    const todayLogs = recentLogs.filter((log) => {
      const d = log.date || log.createdAt;
      return d && formatInTimezone(d, timeZone) === todayStr;
    });

    const totalMl = todayLogs.reduce((sum, log) => {
      const val =
        log.amountMl ??
        (log as unknown as { amount?: number }).amount ??
        0;
      return sum + Number(val);
    }, 0);

    return NextResponse.json(
      new ApiResponse(200, "Today's water intake fetched successfully", {
        totalMl,
        todayStr,
        targetAmount: targets.dailyHydrationTarget,
        logs: todayLogs,
      }),
      { status: 200 }
    );
  })
);
