
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { WaterLog } from "@/models/waterLog";
import { invalidateDashboardCache } from "@/lib/cache/redis-cache";

export const DELETE = withHandler(
  withAuth(
    async (
      _req: NextRequest,
      context: { params: Promise<{ id: string }> },
      sessionUser: TokenPayload
    ) => {
      const { id } = await context.params;

      const deleted = await WaterLog.findOneAndDelete({
        _id: id,
        user: sessionUser.userId,
      });

      if (!deleted) {
        throw new ApiError(404, "Water log not found or unauthorized");
      }

      try {
        await invalidateDashboardCache(sessionUser.userId);
      } catch {
        // Safe fallback if Redis is unavailable
      }

      return NextResponse.json(
        new ApiResponse(200, "Water log deleted successfully", {}),
        { status: 200 }
      );
    }
  )
);
