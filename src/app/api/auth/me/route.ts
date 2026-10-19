
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const user = await User.findById(sessionUser.userId).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
    );

    if (!user) {
      throw new ApiError(404, "User account not found");
    }

    const profile = await Profile.findOne({ user: user._id });

    return NextResponse.json(
      new ApiResponse(200, "Current user fetched successfully", {
        user,
        profile,
        hasProfile: profile?.isProfileComplete ?? false,
        isProfileComplete: profile?.isProfileComplete ?? false,
      }),
      { status: 200 }
    );
  })
);
