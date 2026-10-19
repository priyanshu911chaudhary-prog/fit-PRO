import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { MealPlan } from "@/models/mealPlan";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const plans = await MealPlan.find({ user: sessionUser.userId })
      .populate("schedule.meals.foodItemId", "name calories protein carbs fat mealType dietaryPreference")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      new ApiResponse(200, "Saved meal plans fetched successfully", plans),
      { status: 200 }
    );
  })
);
