
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { setAuthCookies } from "@/lib/auth/cookies";
import { User } from "@/models/user";
import { loginSchema } from "@/validators/auth.validator";

export const POST = withHandler(async (req: NextRequest) => {
  // 1. IP-based rate limit: 20 attempts per hour
  await checkRateLimit(req, {
    keyPrefix: "auth:login:ip",
    limit: 20,
    windowSeconds: 60 * 60,
    message: "Too many login attempts from this network. Please try again after an hour.",
  });

  const body = await validateBody(req, loginSchema);

  // 2. Email-based rate limit (account brute-force protection): 10 attempts per 15 minutes
  await checkRateLimit(req, {
    keyPrefix: "auth:login:email",
    identifier: body.email.toLowerCase(),
    limit: 10,
    windowSeconds: 15 * 60,
    message: "Too many login attempts for this account. Please wait 15 minutes before trying again.",
  });

  const user = await User.findOne({ email: body.email }).select("+password");

  if (!user || user.authProvider !== "local") {
    // Unified error message per approved fix 9
    throw new ApiError(400, "Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(body.password);
  if (!isPasswordValid) {
    // Unified error message per approved fix 9
    throw new ApiError(400, "Invalid email or password");
  }

  if (!user.isVerified) {
    throw new ApiError(400, "Email not verified. Please check your email to verify your account.");
  }

  const accessToken = await user.generateAccessToken();
  const refreshToken = await user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save();

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
  );

  const profile = await (await import("@/models/profile")).Profile.findOne({ user: user._id });
  const hasProfile = !!profile?.isProfileComplete;

  const response = NextResponse.json(
    new ApiResponse(200, "User logged in successfully", {
      user: loggedInUser,
      hasProfile,
      accessToken,
      refreshToken,
    }),
    { status: 200 }
  );

  setAuthCookies(response, accessToken, refreshToken);
  return response;
});
