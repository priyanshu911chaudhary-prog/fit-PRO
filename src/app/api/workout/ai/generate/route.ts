import { NextRequest, NextResponse } from "next/server";
import { generateWorkoutPlanAI } from "@/lib/ai/gemini";
import { mapAIExercisesToIds } from "@/lib/ai/plan-helpers";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { Profile } from "@/models/profile";
import { WorkoutPlan } from "@/models/workoutPlan";

export const maxDuration = 60;

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    // Rate limit AI plan generation: 5 requests per 10 minutes
    await checkRateLimit(req, {
      keyPrefix: "ai:generate-workout",
      limit: 5,
      windowSeconds: 10 * 60,
      identifier: sessionUser.userId,
      message: "You have generated several workout plans recently. Please wait a few minutes before generating another.",
    });

    const userId = sessionUser.userId;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      throw new ApiError(404, "Profile not found. Please complete profile setup first.");
    }

    const rawPlan = await generateWorkoutPlanAI({
      fitnessGoal: profile.fitnessGoal,
      equipmentAvailable: profile.equipmentAvailable,
      experienceLevel: profile.experienceLevel,
    });

    const enrichedSchedule = await mapAIExercisesToIds(rawPlan.schedule);

    // Approved Fix 18: Deactivate previous active plans when a new one is generated
    await WorkoutPlan.updateMany({ user: userId, isActive: true }, { isActive: false });

    const savedPlan = await WorkoutPlan.create({
      user: userId,
      planName: rawPlan.planName,
      schedule: enrichedSchedule,
      isActive: true,
    });

    const populatedPlan = await WorkoutPlan.findById(savedPlan._id).populate(
      "schedule.exercises.exerciseId",
      "name targetMuscle equipment category"
    );

    return NextResponse.json(
      new ApiResponse(200, "AI Plan generated", populatedPlan),
      { status: 200 }
    );
  })
);
