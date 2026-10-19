import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { WorkoutPlan } from "@/models/workoutPlan";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const plans = await WorkoutPlan.find({ user: sessionUser.userId })
      .populate("schedule.exercises.exerciseId", "name targetMuscle equipment category")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      new ApiResponse(200, "Saved plans fetched successfully", plans),
      { status: 200 }
    );
  })
);
