import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { getUserTimezone } from "@/lib/timezone";
import { getWaterToday } from "@/lib/water-today";

export const GET = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const data = await getWaterToday(sessionUser.userId, getUserTimezone(req));
    return NextResponse.json(new ApiResponse(200, "Today's water intake fetched successfully", data));
  })
);
