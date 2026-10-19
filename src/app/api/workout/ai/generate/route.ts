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

    // BUG-015: Concurrency safety - save newly generated plan as inactive first
    const savedPlan = await WorkoutPlan.create({
      user: userId,
      planName: rawPlan.planName,
      schedule: enrichedSchedule,
      isActive: false,
    });

    // Atomic swap: deactivate any previous active plan and activate the new plan safely
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await WorkoutPlan.updateMany(
          { user: userId, _id: { $ne: savedPlan._id }, isActive: true },
          { isActive: false }
        );
        await WorkoutPlan.findByIdAndUpdate(savedPlan._id, { isActive: true });
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
