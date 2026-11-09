
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { TokenPayload } from "@/lib/auth/jwt";
import { User } from "@/models/user";
import { changePasswordSchema } from "@/validators/auth.validator";

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, changePasswordSchema);

    const user = await User.findById(sessionUser.userId).select(
      "+password +refreshToken +previousRefreshToken +previousRefreshTokenExpiry"
    );
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (user.authProvider !== "local") {
      throw new ApiError(400, "Password change is not available for OAuth accounts");
    }

    const isPasswordCorrect = await user.comparePassword(body.oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid old password");
    }

    user.password = body.newPassword;
    user.refreshToken = undefined;
    user.previousRefreshToken = undefined;
    user.previousRefreshTokenExpiry = undefined;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    const response = NextResponse.json(
      new ApiResponse(200, "Password changed successfully", {}),
      { status: 200 }
    );

    clearAuthCookies(response);
    return response;
  })
);
