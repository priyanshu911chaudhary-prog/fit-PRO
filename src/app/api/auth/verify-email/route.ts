
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { User } from "@/models/user";

export const POST = withHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const token = (body.token as string)?.trim();

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
  });

  if (!user) {
    throw new ApiError(400, "Verification link is invalid or has already been used");
  }

  const currentTime = new Date();
  if (user.emailVerificationTokenExpiry && user.emailVerificationTokenExpiry < currentTime) {
    throw new ApiError(400, "Your verification link has expired. Please request a new one.");
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;
  await user.save();

  return NextResponse.json(
    new ApiResponse(200, "Email verified successfully. You can now log in.", {}),
    { status: 200 }
  );
});
