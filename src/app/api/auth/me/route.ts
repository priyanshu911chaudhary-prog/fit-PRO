
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { ACCESS_COOKIE_NAME } from "@/lib/auth/cookies";
import { verifyAccessToken, TokenPayload } from "@/lib/auth/jwt";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";

export const GET = withHandler(async (req: NextRequest) => {
  const cookieToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;

  const token = cookieToken || bearerToken;

  if (!token) {
    // Return guest session state to eliminate unauthenticated 401 console noise
    return NextResponse.json(
      new ApiResponse(200, "Guest session", {
        user: null,
        profile: null,
        hasProfile: false,
        isProfileComplete: false,
      }),
      { status: 200 }
    );
  }

  let sessionUser: TokenPayload;
  try {
    sessionUser = await verifyAccessToken(token);
  } catch {
    return NextResponse.json(
      new ApiResponse(200, "Guest session", {
        user: null,
        profile: null,
        hasProfile: false,
        isProfileComplete: false,
      }),
      { status: 200 }
    );
  }

  const user = await User.findById(sessionUser.userId).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
  );

  if (!user) {
    return NextResponse.json(
      new ApiResponse(200, "Guest session", {
        user: null,
        profile: null,
        hasProfile: false,
        isProfileComplete: false,
      }),
      { status: 200 }
    );
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
});
