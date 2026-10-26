import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody, validateQuery } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { FoodItem } from "@/models/foodItem";
import { MealLog } from "@/models/mealLog";
import {
  calculateItemNutrients,
  aggregateMacroDistribution,
  normalizeDateOnly,
} from "@/lib/nutrition-engine";
import { getUserTimezone, getDayBoundsInTimezone } from "@/lib/timezone";
import {
  logMealSchema,
  mealHistoryQuerySchema,
} from "@/validators/meal.validator";
import { invalidateDashboardCache } from "@/lib/cache/redis-cache";
import { recalculateUserWeeklyScore } from "@/lib/leaderboard/recomputation";

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, logMealSchema);
    const userId = sessionUser.userId;

    // Validate that all referenced food items exist in database and are active
    const foodItemIds = body.meals.map((m) => new mongoose.Types.ObjectId(m.foodItemId));
    const foundFoods = await FoodItem.find({ _id: { $in: foodItemIds }, isActive: { $ne: false } });

    if (foundFoods.length !== foodItemIds.length) {
      throw new ApiError(400, "One or more food item IDs are invalid or inactive");
    }

    const foodsMap = new Map(foundFoods.map((f) => [f._id.toString(), f]));

    // Authoritative Server-side nutrient calculation
    const enrichedMeals = body.meals.map((m) => {
      const food = foodsMap.get(m.foodItemId);
      if (!food) {
        throw new ApiError(400, "Food item not found");
      }

      if (typeof m.quantity !== "number" || isNaN(m.quantity) || m.quantity <= 0) {
        throw new ApiError(400, "Quantity must be greater than 0");
      }
      const quantity = m.quantity;
      const unit = m.unit || food.servingUnit || "g";

      let nutrients;
      try {
        nutrients = calculateItemNutrients(
          {
            name: food.name,
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            servingBasis: food.servingBasis,
            servingUnit: food.servingUnit,
            pieceWeightG: food.pieceWeightG,
            servingWeightG: food.servingWeightG,
          },
          quantity,
          unit
        );
      } catch (err: unknown) {
        throw new ApiError(400, (err as Error).message || "Invalid unit or portion for food item");
      }

      const displayServing =
        m.servingSize && m.servingSize !== "1 serving"
          ? m.servingSize
          : `${quantity} ${unit}`;

      return {
        foodItemId: food._id,
        name: food.name,
        quantity,
        unit,
        servingSize: displayServing,
        calories: Math.round(nutrients.calories),
        protein: Math.round(nutrients.protein * 10) / 10,
        carbs: Math.round(nutrients.carbs * 10) / 10,
        fat: Math.round(nutrients.fat * 10) / 10,
      };
    });

    const mealMacros = aggregateMacroDistribution(enrichedMeals);

    const consumedDate = normalizeDateOnly(body.consumedDate);

    const newLog = await MealLog.create({
      user: userId,
      title: body.title,
      mealType: body.mealType,
      consumedDate,
      totalCalories: mealMacros.totalCalories,
      totalProtein: mealMacros.totalProtein,
      totalCarbs: mealMacros.totalCarbs,
      totalFat: mealMacros.totalFat,
      meals: enrichedMeals,
      completionPercentage: body.completionPercentage ?? 100,
    });

    const populatedLog = await MealLog.findById(newLog._id).populate(
      "meals.foodItemId",
      "name calories protein carbs fat mealType dietaryPreference servingBasis servingUnit pieceWeightG servingWeightG"
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

    return NextResponse.json(
      new ApiResponse(201, "Meal logged successfully!", populatedLog),
      { status: 201 }
    );
  })
);

export const GET = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const query = await validateQuery(req, mealHistoryQuerySchema);
    const userId = sessionUser.userId;

    const userTimezone = getUserTimezone(req);
    const filter: Record<string, unknown> = { user: userId };

    if (query.date) {
      const { startOfDay, endOfDay } = getDayBoundsInTimezone(
        userTimezone,
        new Date(`${query.date}T12:00:00Z`)
      );

      filter.$or = [
        { consumedDate: query.date },
        {
          consumedDate: { $in: [null, ""] },
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
        {
          consumedDate: { $exists: false },
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
      MealLog.find(filter)
        .populate("meals.foodItemId", "name calories protein carbs fat mealType dietaryPreference servingBasis servingUnit pieceWeightG servingWeightG")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit),
      MealLog.countDocuments(filter),
    ]);

    // Aggregate daily totals if filtering by date, or for the fetched logs
    let dailyTotals = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      proteinPct: 0,
      carbsPct: 0,
      fatPct: 0,
    };

    if (query.date) {
      const allDayMeals = await MealLog.find(filter);
      dailyTotals = aggregateMacroDistribution(
        allDayMeals.map((m) => ({
          calories: m.totalCalories || 0,
          protein: m.totalProtein || 0,
          carbs: m.totalCarbs || 0,
          fat: m.totalFat || 0,
        }))
      );
    }

    return NextResponse.json(
      new ApiResponse(200, "Meal history fetched", {
        logs,
        dailyTotals,
        currentPage: query.page,
        totalPages: Math.ceil(totalLogs / query.limit),
        totalLogs,
      }),
      { status: 200 }
    );
  })
);
