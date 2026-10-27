
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { enqueueEmailVerification } from "@/lib/queues/jobs";
import { env } from "@/lib/env";
import { User } from "@/models/user";
import { registerSchema } from "@/validators/auth.validator";

export const POST = withHandler(async (req: NextRequest) => {
  // Rate limit: 20 attempts per hour for auth endpoints
  await checkRateLimit(req, {
    keyPrefix: "auth:register",
    limit: 20,
    windowSeconds: 60 * 60,
    message: "Too many registration attempts. Please try again after an hour.",
  });

  const body = await validateBody(req, registerSchema);

  const existingUser = await User.findOne({ email: body.email });
  if (existingUser) {
    throw new ApiError(400, "Email already in use", ["A user with this email address already exists"]);
  }

  const user = await User.create({
    fullName: body.fullName,
    email: body.email,
    password: body.password,
    isVerified: false,
    authProvider: "local",
  });

  // Generate 24 hour verification token (Approved Fix 1)
  const { unhasedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken(24 * 60 * 60 * 1000);

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;
  await user.save();

  const verificationLink = `${env.APP_URL}/verify-email/${unhasedToken}`;

  let emailSent = true;
  try {
    await enqueueEmailVerification({
      recipientEmail: user.email,
      fullName: user.fullName,
      verificationLink,
    });
  } catch {
    emailSent = false;
  }

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
  );

  return NextResponse.json(
    new ApiResponse(
      201,
      emailSent
        ? "User registered successfully. Please check your email to verify your account."
        : "User registered, but verification email delivery failed. You can request a new verification email.",
      {
        user: createdUser,
        emailSent,
      }
    ),
    { status: 201 }
  );
});
