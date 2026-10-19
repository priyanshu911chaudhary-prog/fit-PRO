import { NextRequest, NextResponse } from "next/server";
import { generateMealPlanAI } from "@/lib/ai/gemini";
import { mapAIMealsToIds } from "@/lib/ai/plan-helpers";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { MealPlan } from "@/models/mealPlan";
import { Profile } from "@/models/profile";

export const maxDuration = 60;

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    // Rate limit AI plan generation: 5 requests per 10 minutes
    await checkRateLimit(req, {
      keyPrefix: "ai:generate-meal",
      limit: 5,
      windowSeconds: 10 * 60,
      identifier: sessionUser.userId,
      message: "You have generated several meal plans recently. Please wait a few minutes before generating another.",
    });

    const userId = sessionUser.userId;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      throw new ApiError(404, "Profile not found. Please complete profile setup first.");
    }

    const rawPlan = await generateMealPlanAI({
      fitnessGoal: profile.fitnessGoal,
      dietaryPreference: profile.dietaryPreference,
    });

    const enrichedSchedule = await mapAIMealsToIds(rawPlan.schedule);

    // BUG-015: Concurrency safety - save newly generated plan as inactive first
    const savedPlan = await MealPlan.create({
      user: userId,
      planName: rawPlan.planName,
      schedule: enrichedSchedule,
      isActive: false,
    });

    // Atomic swap: deactivate any previous active plan and activate the new plan safely
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await MealPlan.updateMany(
          { user: userId, _id: { $ne: savedPlan._id }, isActive: true },
          { isActive: false }
        );
        await MealPlan.findByIdAndUpdate(savedPlan._id, { isActive: true });
        break;
      } catch (err: unknown) {
        const error = err as { code?: number };
        if (error.code === 11000 && attempt < 4) {
          await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }

    const populatedPlan = await MealPlan.findById(savedPlan._id).populate(
      "schedule.meals.foodItemId",
      "name calories protein carbs fat mealType dietaryPreference"
    );

    return NextResponse.json(
      new ApiResponse(200, "AI Meal Plan generated", populatedPlan),
      { status: 200 }
    );
  })
);
