
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
import { getUserTimezone, getDayBoundsInTimezone, formatInTimezone } from "@/lib/timezone";
import { calculateEstimatedCaloriesBurn } from "@/features/workout/lib/calculations";
import { invalidateDashboardCache } from "@/lib/cache/redis-cache";
import { recalculateUserWeeklyScore } from "@/lib/leaderboard/recomputation";
import { enqueueLeaderboardRecalculation } from "@/lib/queues/jobs";
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

    const userTimezone = getUserTimezone(req);
    const logDate = body.date || formatInTimezone(new Date(), userTimezone);

    const newLog = await WorkoutLog.create({
      user: userId,
      title: body.title,
      exercises: body.exercises,
      totalDuration: body.totalDuration,
      completionPercentage: body.completionPercentage ?? 100,
      date: logDate,
    });

    const populatedLog = await WorkoutLog.findById(newLog._id).populate(
      "exercises.exerciseId",
      "name targetMuscle category equipment"
    );

    try {
      await invalidateDashboardCache(userId);
    } catch {
      // Safe fallback if Redis is unavailable
    }

    try {
      await recalculateUserWeeklyScore(userId);
    } catch {
      // Safe fallback: failure is queued into LeaderboardOutbox
    }

    try {
      await enqueueLeaderboardRecalculation({ userId });
    } catch {
      // Safe fallback: handled via durable outbox
    }

    try {
      const { enqueueActivityEvaluation } = await import("@/lib/queues/jobs");
      await enqueueActivityEvaluation({
        userId,
        eventType: "workout",
        logId: newLog._id.toString(),
        date: logDate,
      });
    } catch {
      // Safe fallback
    }

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

    const userTimezone = getUserTimezone(req);
    const filter: Record<string, unknown> = { user: userId };

    if (query.date) {
      const { startOfDay, endOfDay } = getDayBoundsInTimezone(
        userTimezone,
        new Date(`${query.date}T12:00:00Z`)
      );

      filter.$or = [
        { date: query.date },
        {
          date: { $in: [null, ""] },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
        {
          date: { $exists: false },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      ];
    } else if (query.startDate && query.endDate) {
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

    // Aggregate daily totals across all matching logs for that day (or the fetched logs)
    const allMatchingWorkouts = query.date ? await WorkoutLog.find(filter).lean() : logs;
    let totalVolumeTonnage = 0;
    let totalSetsCount = 0;
    let totalDuration = 0;
    const distinctExerciseIds = new Set<string>();

    for (const w of allMatchingWorkouts) {
      totalDuration += Number(w.totalDuration) || 0;
      for (const ex of w.exercises || []) {
        if (ex.exerciseId) {
          const exIdStr = String(
            typeof ex.exerciseId === "object" && ex.exerciseId !== null && "_id" in ex.exerciseId
              ? (ex.exerciseId as unknown as Record<string, unknown>)._id
              : ex.exerciseId
          );
          distinctExerciseIds.add(exIdStr);
        }
        const sCount = Number(ex.sets) || 1;
        const reps = Number(ex.reps) || 0;
        const weight = Number(ex.weight) || 0;
        totalVolumeTonnage += sCount * reps * weight;
        totalSetsCount += sCount;
      }
    }

    const dailyTotals = {
      totalVolumeTonnage,
      exercisesCount: distinctExerciseIds.size,
      totalSetsCount,
      totalDuration,
      estimatedCaloriesBurn: calculateEstimatedCaloriesBurn(totalDuration, totalVolumeTonnage),
    };

    return NextResponse.json(
      new ApiResponse(200, "History fetched", {
        logs,
        currentPage: query.page,
        totalPages: Math.ceil(totalLogs / query.limit),
        totalLogs,
        dailyTotals,
      }),
      { status: 200 }
    );
  })
);
