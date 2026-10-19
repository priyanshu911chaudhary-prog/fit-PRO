
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { User } from "@/models/user";
import { resetPasswordSchema } from "@/validators/auth.validator";

export const POST = withHandler(
  async (
    req: NextRequest,
    context: { params: Promise<{ token: string }> }
  ) => {
    const { token } = await context.params;

    if (!token?.trim()) {
      throw new ApiError(400, "Reset token is missing");
    }

    const body = await validateBody(req, resetPasswordSchema);

    const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
    });

    if (!user) {
      throw new ApiError(400, "Reset token is invalid or has expired");
    }

    const currentTime = new Date();
    if (user.forgotPasswordTokenExpiry && user.forgotPasswordTokenExpiry < currentTime) {
      throw new ApiError(400, "Your reset token has expired. Please request a new one.");
    }

    user.password = body.newPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined;
    await user.save();

    return NextResponse.json(
      new ApiResponse(
        200,
        "Password reset successfully. You can now log in with your new password.",
        {}
      ),
      { status: 200 }
    );
  }
);
