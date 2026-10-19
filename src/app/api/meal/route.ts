
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
  logMealSchema,
  mealHistoryQuerySchema,
} from "@/validators/meal.validator";

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const body = await validateBody(req, logMealSchema);
    const userId = sessionUser.userId;

    // Approved Fix 3: Validate that all referenced food items exist in database
    const foodItemIds = body.meals.map((m) => new mongoose.Types.ObjectId(m.foodItemId));
    const foundFoods = await FoodItem.find({ _id: { $in: foodItemIds } });

    if (foundFoods.length !== foodItemIds.length) {
      throw new ApiError(400, "One or more food item IDs are invalid or do not exist in the database");
    }

    // CHK-064: Server computes calories from catalog food x quantity and IGNORES any client-supplied calories or totals
    const foodsMap = new Map(foundFoods.map((f) => [f._id.toString(), f]));
    let computedCalories = 0;

    const enrichedMeals = body.meals.map((m) => {
      const food = foodsMap.get(m.foodItemId);
      if (!food) {
        throw new ApiError(400, "Food item not found");
      }

      // Quantity from validated quantity property or parsed from servingSize
      let quantity = m.quantity;
      if (!quantity || quantity <= 0) {
        const parsed = parseFloat(m.servingSize);
        quantity = !isNaN(parsed) && parsed > 0 ? parsed : 1;
      }

      const itemCalories = Math.round(food.calories * quantity);
      computedCalories += itemCalories;

      return {
        foodItemId: m.foodItemId,
        servingSize: m.servingSize,
        calories: itemCalories,
      };
    });

    const totalCalories = computedCalories;

    const newLog = await MealLog.create({
      user: userId,
      title: body.title,
      meals: enrichedMeals,
      totalCalories,
      completionPercentage: body.completionPercentage ?? 100,
    });

    const populatedLog = await MealLog.findById(newLog._id).populate(
      "meals.foodItemId",
      "name calories protein carbs fat mealType dietaryPreference"
    );

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
      MealLog.find(filter)
        .populate("meals.foodItemId", "name calories protein carbs fat mealType dietaryPreference")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit),
      MealLog.countDocuments(filter),
    ]);

    return NextResponse.json(
      new ApiResponse(200, "Meal history fetched", {
        logs,
        currentPage: query.page,
        totalPages: Math.ceil(totalLogs / query.limit),
        totalLogs,
      }),
      { status: 200 }
    );
  })
);
