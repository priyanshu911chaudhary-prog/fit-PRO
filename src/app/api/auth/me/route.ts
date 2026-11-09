import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, setAuthCookies } from "@/lib/auth/cookies";
import { verifyAccessToken, verifyRefreshToken, TokenPayload } from "@/lib/auth/jwt";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";

export const GET = withHandler(async (req: NextRequest) => {
  const cookieToken = req.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;

  const token = cookieToken || bearerToken;
  const incomingRefreshToken = req.cookies.get(REFRESH_COOKIE_NAME)?.value;

  let sessionUser: TokenPayload | null = null;
  if (token) {
    try {
      sessionUser = await verifyAccessToken(token);
    } catch {
      sessionUser = null;
    }
  }

  // If access token is invalid or missing, attempt session restoration via refresh token
  if (!sessionUser && incomingRefreshToken) {
    try {
      const decoded = await verifyRefreshToken(incomingRefreshToken);
      const refreshUser = await User.findById(decoded.userId).select(
        "+refreshToken +previousRefreshToken +previousRefreshTokenExpiry"
      );
      if (refreshUser) {
        const isCurrentToken = Boolean(refreshUser.refreshToken && incomingRefreshToken === refreshUser.refreshToken);
        const isGraceToken =
          incomingRefreshToken === refreshUser.previousRefreshToken &&
          refreshUser.previousRefreshTokenExpiry &&
          refreshUser.previousRefreshTokenExpiry > new Date();

        if (isCurrentToken || (isGraceToken && refreshUser.refreshToken)) {
          const profile = await Profile.findOne({ user: refreshUser._id });
          const hasProfile = profile?.isProfileComplete ?? false;

          let newAccessToken: string;
          let newRefreshToken: string;

          if (isGraceToken && refreshUser.refreshToken) {
            newAccessToken = await refreshUser.generateAccessToken(hasProfile);
            newRefreshToken = refreshUser.refreshToken;
          } else {
            newAccessToken = await refreshUser.generateAccessToken(hasProfile);
            newRefreshToken = await refreshUser.generateRefreshToken();

            refreshUser.previousRefreshToken = refreshUser.refreshToken;
            refreshUser.previousRefreshTokenExpiry = new Date(Date.now() + 30 * 1000);
            refreshUser.refreshToken = newRefreshToken;
            await refreshUser.save();
          }

          const safeUser = await User.findById(refreshUser._id).select(
            "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
          );

          const response = NextResponse.json(
            new ApiResponse(200, "Current user fetched successfully (session refreshed)", {
              user: safeUser,
              profile,
              hasProfile,
              isProfileComplete: hasProfile,
            }),
            { status: 200 }
          );

          setAuthCookies(response, newAccessToken, newRefreshToken);
          return response;
        }
      }
    } catch {
      // Refresh token failed: continue to guest response
    }
  }

  if (!sessionUser) {
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

  const user = await User.findById(sessionUser.userId).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry"
  );

  if (!user || (user.tokenVersion ?? 0) !== (sessionUser.tokenVersion ?? 0)) {
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
