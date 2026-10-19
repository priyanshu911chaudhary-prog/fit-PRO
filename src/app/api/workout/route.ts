
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody, validateQuery } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { Exercise } from "@/models/exercise";
import { WorkoutLog } from "@/models/workoutLog";
import {
  logWorkoutSchema,
  workoutHistoryQuerySchema,
} from "@/validators/workout.validator";

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, logWorkoutSchema);
    const userId = sessionUser.userId;

    // Approved Fix 3: Validate that all referenced exercises exist in the database
    const exerciseIds = body.exercises.map((e) => new mongoose.Types.ObjectId(e.exerciseId));
    const foundExercises = await Exercise.find({ _id: { $in: exerciseIds } });

    if (foundExercises.length !== exerciseIds.length) {
      throw new ApiError(400, "One or more exercise IDs are invalid or do not exist in the database");
    }

    const newLog = await WorkoutLog.create({
      user: userId,
      title: body.title,
      exercises: body.exercises,
      totalDuration: body.totalDuration,
      completionPercentage: body.completionPercentage ?? 100,
    });

    const populatedLog = await WorkoutLog.findById(newLog._id).populate(
      "exercises.exerciseId",
      "name targetMuscle category equipment"
    );

    return NextResponse.json(
      new ApiResponse(201, "Workout logged successfully!", populatedLog),
      { status: 201 }
    );
  })
);

export const GET = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const query = await validateQuery(req, workoutHistoryQuerySchema);
    const userId = sessionUser.userId;

    const filter: Record<string, unknown> = { user: userId };

    if (query.startDate && query.endDate) {
      filter.createdAt = {
        $gte: query.startDate,
        $lte: query.endDate,
      };
    } else if (query.startDate) {
      filter.createdAt = { $gte: query.startDate };
    } else if (query.endDate) {
      filter.createdAt = { $lte: query.endDate };
    }

    const skip = (query.page - 1) * query.limit;

    const [logs, totalLogs] = await Promise.all([
      WorkoutLog.find(filter)
        .populate("exercises.exerciseId", "name targetMuscle category equipment")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit),
      WorkoutLog.countDocuments(filter),
    ]);

    return NextResponse.json(
      new ApiResponse(200, "History fetched", {
        logs,
        currentPage: query.page,
        totalPages: Math.ceil(totalLogs / query.limit),
        totalLogs,
      }),
      { status: 200 }
    );
  })
);
