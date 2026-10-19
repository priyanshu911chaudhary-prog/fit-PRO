import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { calculateAge, calculateBMI, getFitnessMetrics } from "@/lib/fitness-calc";
import { formatInTimezone, getUserTimezone } from "@/lib/timezone";
import { Bmi } from "@/models/bmi";
import { MealLog } from "@/models/mealLog";
import { Profile } from "@/models/profile";
import { WaterLog } from "@/models/waterLog";
import { WorkoutLog } from "@/models/workoutLog";

export const GET = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;
    const timeZone = getUserTimezone(req);
    const todayStr = formatInTimezone(new Date(), timeZone);
    const [profile, initialBmiHistory, allWorkoutLogs, recentWorkouts, recentMeals, recentWaterLogs] =
      await Promise.all([
        Profile.findOne({ user: userId }),
        Bmi.find({ user: userId }).sort({ date: 1 }).limit(30).select("bmi weight date createdAt -_id"),
        WorkoutLog.find({ user: userId }).sort({ createdAt: -1 }).select("createdAt"),
        WorkoutLog.find({ user: userId }).sort({ createdAt: -1 }).limit(3),
        MealLog.find({ user: userId }).sort({ createdAt: -1 }).limit(3),
        WaterLog.find({ user: userId }).sort({ createdAt: -1, date: -1 }).limit(100),
      ]);

    if (!profile) {
      throw new ApiError(404, "Profile not found. Please complete onboarding.");
    }

    let bmiHistory = initialBmiHistory;

    // Auto-seed initial baseline BMI record if none exists yet
    if (bmiHistory.length === 0 && profile.weight && profile.height) {
      const { bmi, category } = calculateBMI(profile.weight, profile.height);
      const baseline = await Bmi.create({
        user: userId,
        weight: profile.weight,
        height: profile.height,
        bmi,
        category,
        date: profile.createdAt || new Date(),
      });
      bmiHistory = [baseline];
    }

    // Timezone-aware streak calculation (Approved Fix 7)
    let streak = 0;
    if (allWorkoutLogs && allWorkoutLogs.length > 0) {
      const dates = [
        ...new Set(
          allWorkoutLogs.map((log) => formatInTimezone(log.createdAt, timeZone))
        ),
      ];

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatInTimezone(yesterday, timeZone);

      if (dates[0] === todayStr) {
        streak++;
        dates.shift(); // remove today
      } else if (dates[0] !== yesterdayStr) {
        streak = 0;
      }

      if (streak > 0 || dates[0] === yesterdayStr) {
        const runnerDate = new Date(yesterday);
        for (const dateStr of dates) {
          const expectedStr = formatInTimezone(runnerDate, timeZone);
          if (dateStr === expectedStr) {
            streak++;
            runnerDate.setDate(runnerDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Compute live today water intake
    const todayWaterLogs = recentWaterLogs.filter((log) => {
      const d = log.date || log.createdAt;
      return d && formatInTimezone(d, timeZone) === todayStr;
    });
    const totalWaterMl = todayWaterLogs.reduce((sum, log) => {
      const val =
        log.amountMl ??
        (log as unknown as { amount?: number }).amount ??
        0;
      return sum + Number(val);
    }, 0);
    const targetWaterMl = 2500;

    const effectiveAge = profile.dob ? calculateAge(profile.dob) : profile.age || 25;
    const metrics = getFitnessMetrics({
      weight: profile.weight,
      height: profile.height,
      dob: profile.dob,
      age: effectiveAge,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
    });

    const stats = {
      streak,
      waterToday: {
        totalMl: totalWaterMl,
        targetMl: targetWaterMl,
        percentage: Math.min(100, Math.round((totalWaterMl / targetWaterMl) * 100)),
      },
      metrics: {
        bmi: metrics.bmi,
        category: metrics.bmiCategory,
        bmr: metrics.bmr,
        tdee: metrics.tdee,
        weight: profile.weight,
        height: profile.height,
      },
      weightHistory: bmiHistory.map((entry) => {
        const entryDate = entry.date || (entry as unknown as { createdAt?: Date }).createdAt || new Date();
        return {
          date: formatInTimezone(new Date(entryDate), timeZone),
          weight: entry.weight,
          bmi: entry.bmi,
        };
      }),
      recentWorkouts: recentWorkouts.map((w) => ({
        _id: w._id.toString(),
        date: formatInTimezone(w.createdAt, timeZone),
        workoutType: w.title || "Workout",
        duration: w.totalDuration || 45,
        exercisesCount: w.exercises?.length || 0,
      })),
      recentMeals: recentMeals.map((m) => ({
        _id: m._id.toString(),
        date: formatInTimezone(m.createdAt, timeZone),
        mealType: m.title || "Meal",
        totalCalories: m.totalCalories || 0,
      })),
    };

    const dashboardData = {
      stats,
      ...stats,
      profile: {
        goal: profile.fitnessGoal,
        isProfileComplete: profile.isProfileComplete,
        streak,
      },
      currentMetrics: metrics,
      charts: {
        weightTrend: bmiHistory.map((entry) => {
          const entryDate = entry.date || (entry as unknown as { createdAt?: Date }).createdAt || new Date();
          return {
            date: formatInTimezone(new Date(entryDate), timeZone),
            weight: entry.weight,
          };
        }),
        bmiTrend: bmiHistory.map((entry) => {
          const entryDate = entry.date || (entry as unknown as { createdAt?: Date }).createdAt || new Date();
          return {
            date: formatInTimezone(new Date(entryDate), timeZone),
            bmi: entry.bmi,
          };
        }),
      },
    };

    return NextResponse.json(
      new ApiResponse(200, "Dashboard data retrieved successfully", dashboardData),
      { status: 200 }
    );
  })
);
