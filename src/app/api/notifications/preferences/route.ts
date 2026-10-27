import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import {
  getOrCreateNotificationPreferences,
} from "@/models/notificationPreferences";
import { isValidTimezone, calculateNextCheckInTime } from "@/lib/notifications/rules";

const updatePreferencesSchema = z.object({
  timezone: z
    .string()
    .refine(isValidTimezone, { message: "Invalid IANA timezone identifier" })
    .optional(),
  proactiveNudgesEnabled: z.boolean().optional(),
  achievementsEnabled: z.boolean().optional(),
  categories: z
    .object({
      hydration: z.boolean().optional(),
      workout: z.boolean().optional(),
      nutrition: z.boolean().optional(),
    })
    .optional(),
  checkInTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "checkInTime must be in HH:mm format (00:00 to 23:59)")
    .optional(),
  channels: z
    .object({
      inApp: z.boolean().optional(),
      email: z.boolean().optional(),
      push: z.boolean().optional(),
    })
    .optional(),
  quietHours: z
    .object({
      enabled: z.boolean().optional(),
      start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "start time must be HH:mm").optional(),
      end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "end time must be HH:mm").optional(),
    })
    .optional(),
});

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const preferences = await getOrCreateNotificationPreferences(sessionUser.userId);
    return NextResponse.json(
      new ApiResponse(200, "Notification preferences retrieved successfully", preferences),
      { status: 200 }
    );
  })
);

export const PATCH = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, updatePreferencesSchema);
    const preferences = await getOrCreateNotificationPreferences(sessionUser.userId);

    if (body.timezone !== undefined) preferences.timezone = body.timezone;
    if (body.proactiveNudgesEnabled !== undefined) {
      preferences.proactiveNudgesEnabled = body.proactiveNudgesEnabled;
    }
    if (body.achievementsEnabled !== undefined) {
      preferences.achievementsEnabled = body.achievementsEnabled;
    }
    if (body.checkInTime !== undefined) {
      preferences.checkInTime = body.checkInTime;
    }

    if (body.categories) {
      if (body.categories.hydration !== undefined) {
        preferences.categories.hydration = body.categories.hydration;
      }
      if (body.categories.workout !== undefined) {
        preferences.categories.workout = body.categories.workout;
      }
      if (body.categories.nutrition !== undefined) {
        preferences.categories.nutrition = body.categories.nutrition;
      }
    }

    if (body.channels) {
      if (body.channels.inApp !== undefined) {
        preferences.channels.inApp = body.channels.inApp;
      }
      if (body.channels.email !== undefined) {
        preferences.channels.email = body.channels.email;
      }
      if (body.channels.push !== undefined) {
        preferences.channels.push = body.channels.push;
      }
    }

    if (body.quietHours) {
      if (body.quietHours.enabled !== undefined) {
        preferences.quietHours.enabled = body.quietHours.enabled;
      }
      if (body.quietHours.start !== undefined) {
        preferences.quietHours.start = body.quietHours.start;
      }
      if (body.quietHours.end !== undefined) {
        preferences.quietHours.end = body.quietHours.end;
      }
    }

    // Recompute indexed nextCheckInAt date for proactive nudges
    if (preferences.proactiveNudgesEnabled) {
      preferences.nextCheckInAt = calculateNextCheckInTime(
        preferences.timezone || "Asia/Kolkata",
        preferences.checkInTime || "18:00"
      );
    } else {
      preferences.nextCheckInAt = undefined;
    }

    await preferences.save();

    return NextResponse.json(
      new ApiResponse(200, "Notification preferences updated successfully", preferences),
      { status: 200 }
    );
  })
);
