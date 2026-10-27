
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { enqueuePasswordReset } from "@/lib/queues/jobs";
import { env } from "@/lib/env";
import { User } from "@/models/user";
import { forgotPasswordSchema } from "@/validators/auth.validator";

export const POST = withHandler(async (req: NextRequest) => {
  // 1. IP-based rate limit: 10 attempts per hour
  await checkRateLimit(req, {
    keyPrefix: "auth:forgot-password:ip",
    limit: 10,
    windowSeconds: 60 * 60,
    message: "Too many password reset requests from this network. Please try again after an hour.",
  });

  const body = await validateBody(req, forgotPasswordSchema);

  // 2. Email-based rate limit: 3 attempts per 15 minutes
  await checkRateLimit(req, {
    keyPrefix: "auth:forgot-password:email",
    identifier: body.email.toLowerCase(),
    limit: 3,
    windowSeconds: 15 * 60,
    message: "Too many password reset requests for this email. Please wait 15 minutes before requesting again.",
  });

  const user = await User.findOne({ email: body.email });

  // Non-enumerating: never reveal existence or external provider (Approved fix 10)
  if (user && user.authProvider === "local") {
    // 15 minutes token expiry (Approved fix 1)
    const { unhasedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken(15 * 60 * 1000);

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordTokenExpiry = tokenExpiry;
    await user.save();

    const resetLink = `${env.APP_URL}/reset-password/${unhasedToken}`;

    await enqueuePasswordReset({
      recipientEmail: user.email,
      fullName: user.fullName,
      resetLink,
    });
  }

  return NextResponse.json(
    new ApiResponse(
      200,
      "If an account with that email exists, a password reset link has been sent.",
      {}
    ),
    { status: 200 }
  );
});
