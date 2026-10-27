import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { PushSubscription } from "@/models/pushSubscription";
import { NotificationPreferences } from "@/models/notificationPreferences";
import { getEnv } from "@/lib/env";

const subscribeSchema = z.object({
  endpoint: z.string().url("Valid push endpoint URL required"),
  keys: z.object({
    p256dh: z.string().min(1, "p256dh key is required"),
    auth: z.string().min(1, "auth secret is required"),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url("Valid push endpoint URL required"),
});

/**
 * GET /api/notifications/push/subscribe
 * Exposes the public VAPID key so the client browser can subscribe to Web Push.
 */
export const GET = withHandler(async () => {
  const env = getEnv();
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    throw new ApiError(503, "Push notifications are not configured: VAPID public key missing");
  }

  return NextResponse.json(
    new ApiResponse(200, "VAPID public key retrieved successfully", { publicKey }),
    { status: 200 }
  );
});

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, subscribeSchema);
    const userId = sessionUser.userId;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Upsert the subscription for this endpoint
    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint: body.endpoint },
      {
        $set: {
          user: userId,
          keys: body.keys,
          userAgent,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // Automatically enable push channel in preferences if registered
    await NotificationPreferences.findOneAndUpdate(
      { user: userId },
      { $set: { "channels.push": true } },
      { upsert: true }
    ).catch(() => {});

    return NextResponse.json(
      new ApiResponse(200, "Push subscription registered successfully", {
        id: subscription._id,
        endpoint: subscription.endpoint,
      }),
      { status: 200 }
    );
  })
);

export const DELETE = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, unsubscribeSchema);
    const userId = sessionUser.userId;

    const result = await PushSubscription.deleteOne({
      endpoint: body.endpoint,
      user: userId,
    });

    if (result.deletedCount === 0) {
      throw new ApiError(404, "Push subscription not found or not owned by user");
    }

    // If user has no more subscriptions, update push channel in preferences
    const remainingCount = await PushSubscription.countDocuments({ user: userId });
    if (remainingCount === 0) {
      await NotificationPreferences.findOneAndUpdate(
        { user: userId },
        { $set: { "channels.push": false } }
      ).catch(() => {});
    }

    return NextResponse.json(
      new ApiResponse(200, "Push subscription removed successfully", {
        deletedCount: result.deletedCount,
      }),
      { status: 200 }
    );
  })
);
