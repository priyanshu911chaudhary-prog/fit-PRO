
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { enqueueEmailVerification } from "@/lib/queues/jobs";
import { env } from "@/lib/env";
import { User } from "@/models/user";
import { resendVerificationSchema } from "@/validators/auth.validator";

export const POST = withHandler(async (req: NextRequest) => {
  // 1. IP-based rate limit: 10 attempts per hour
  await checkRateLimit(req, {
    keyPrefix: "auth:resend-verification:ip",
    limit: 10,
    windowSeconds: 60 * 60,
    message: "Too many verification requests from this network. Please try again after an hour.",
  });

  const body = await validateBody(req, resendVerificationSchema);

  // 2. Email-based rate limit: 3 attempts per 15 minutes
  await checkRateLimit(req, {
    keyPrefix: "auth:resend-verification:email",
    identifier: body.email.toLowerCase(),
    limit: 3,
    windowSeconds: 15 * 60,
    message: "Too many verification requests for this email. Please wait 15 minutes before requesting again.",
  });

  const user = await User.findOne({ email: body.email });

  if (user && !user.isVerified && user.authProvider === "local") {
    // 24 hour verification token
    const { unhasedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken(24 * 60 * 60 * 1000);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpiry = tokenExpiry;
    await user.save();

    const verificationLink = `${env.APP_URL}/verify-email/${unhasedToken}`;

    await enqueueEmailVerification({
      recipientEmail: user.email,
      fullName: user.fullName,
      verificationLink,
    });
  }

  return NextResponse.json(
    new ApiResponse(
      200,
      "If an unverified account with that email exists, a new verification link has been sent.",
      {}
    ),
    { status: 200 }
  );
});
