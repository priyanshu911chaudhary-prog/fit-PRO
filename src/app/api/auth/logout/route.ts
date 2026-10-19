
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { ACCESS_COOKIE_NAME, clearAuthCookies } from "@/lib/auth/cookies";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { User } from "@/models/user";

export const POST = withHandler(async (req: NextRequest) => {
  const token =
    req.cookies.get(ACCESS_COOKIE_NAME)?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const decoded = await verifyAccessToken(token);
      await User.findByIdAndUpdate(decoded.userId, {
        $unset: { refreshToken: 1 },
      });
    } catch {
      // If token is invalid or expired, still clear cookies cleanly
    }
  }

  const response = NextResponse.json(
    new ApiResponse(200, "User logged out successfully", {}),
    { status: 200 }
  );

  clearAuthCookies(response);
  return response;
});
