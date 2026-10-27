import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { verifyUnsubscribeToken } from "@/lib/notifications/unsubscribe-token";
import { NotificationPreferences } from "@/models/notificationPreferences";
import { connectDB } from "@/lib/db";
import { logger } from "@/lib/logger";

function renderSuccessHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed — Fit-PRO</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 20px; font-weight: 600; color: #10b981; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 9999px; font-size: 12px; font-weight: 500; margin-bottom: 16px; }
    a { display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; transition: background 0.2s; }
    a:hover { background-color: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Preferences Updated</div>
    <h1>Unsubscribed from Wellness Emails</h1>
    <p>You have been safely unsubscribed from Fit-PRO wellness nudges and habit reminders. You will not receive any further optional wellness emails.</p>
    <p style="font-size: 12px; color: #6b7280;">Security notifications such as password resets and account verification will remain active.</p>
    <a href="/login">Return to Fit-PRO</a>
  </div>
</body>
</html>`;
}

function renderErrorHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid Link — Fit-PRO</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; max-width: 480px; width: 100%; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 20px; font-weight: 600; color: #ef4444; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; color: #9ca3af; line-height: 1.6; margin-bottom: 24px; }
    a { display: inline-block; background-color: #374151; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Invalid or Expired Link</h1>
    <p>This unsubscribe link is invalid, tampered, or has expired. If you wish to manage your notification preferences, please log in to your account.</p>
    <a href="/login">Go to Login</a>
  </div>
</body>
</html>`;
}

/**
 * GET /api/notifications/unsubscribe?token=...
 * One-click unsubscribe link from wellness emails.
 */
export const GET = withHandler(async (req: NextRequest) => {
  await connectDB();
  const token = req.nextUrl.searchParams.get("token") || "";

  const userId = await verifyUnsubscribeToken(token);
  const wantsJson = req.headers.get("accept")?.includes("application/json");

  if (!userId) {
    if (wantsJson) {
      return NextResponse.json(
        new ApiResponse(400, "Invalid, tampered, or expired unsubscribe token", null),
        { status: 400 }
      );
    }
    return new NextResponse(renderErrorHtml(), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Atomically update user notification preferences
  await NotificationPreferences.updateOne(
    { user: userId },
    { $set: { "channels.email": false } }
  );

  logger.info("User unsubscribed from wellness emails via unauthenticated token", {
    userId,
  });

  if (wantsJson) {
    return NextResponse.json(
      new ApiResponse(200, "Successfully unsubscribed from wellness emails", {
        unsubscribed: true,
      }),
      { status: 200 }
    );
  }

  return new NextResponse(renderSuccessHtml(), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

/**
 * POST /api/notifications/unsubscribe
 * JSON or form-based unsubscribe endpoint.
 */
export const POST = withHandler(async (req: NextRequest) => {
  await connectDB();
  let token = "";

  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      token = body?.token || "";
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      token = (formData.get("token") as string) || "";
    }
  } catch {
    token = "";
  }

  if (!token) {
    token = req.nextUrl.searchParams.get("token") || "";
  }

  const userId = await verifyUnsubscribeToken(token);
  if (!userId) {
    return NextResponse.json(
      new ApiResponse(400, "Invalid, tampered, or expired unsubscribe token", null),
      { status: 400 }
    );
  }

  await NotificationPreferences.updateOne(
    { user: userId },
    { $set: { "channels.email": false } }
  );

  logger.info("User unsubscribed from wellness emails via POST token", {
    userId,
  });

  return NextResponse.json(
    new ApiResponse(200, "Successfully unsubscribed from wellness emails", {
      unsubscribed: true,
    }),
    { status: 200 }
  );
});
