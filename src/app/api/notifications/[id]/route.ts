import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { Notification } from "@/models/notification";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = withHandler<RouteParams>(
  withAuth(async (req: NextRequest, context: RouteParams, sessionUser: TokenPayload) => {
    const { id } = await context.params;

    let body: { clicked?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const notification = await Notification.findOne({
      _id: id,
      user: sessionUser.userId,
    });

    if (!notification) {
      throw new ApiError(404, "Notification not found or access denied");
    }

    if (!notification.readAt) {
      notification.readAt = new Date();
    }
    if (body.clicked && !notification.clickedAt) {
      notification.clickedAt = new Date();
    }

    await notification.save();

    return NextResponse.json(
      new ApiResponse(200, "Notification updated successfully", notification),
      { status: 200 }
    );
  })
);
