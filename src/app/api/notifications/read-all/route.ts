import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { Notification } from "@/models/notification";

export const PATCH = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const result = await Notification.updateMany(
      {
        user: sessionUser.userId,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

    return NextResponse.json(
      new ApiResponse(200, "All notifications marked as read", {
        modifiedCount: result.modifiedCount,
      }),
      { status: 200 }
    );
  })
);
