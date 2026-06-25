import {MealLog} from "../models/MealLog.model.js";
import "../models/foodItem.model.js"; // Ensure FoodItem model is loaded for population
import asyncHandler from "../utils/async-handler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";

const logMeal = asyncHandler(async (req, res) => {
    const { title, meals, totalCalories } = req.body;
    const userId = req.user._id;

    // Validate incoming meal data
    if (!meals || meals.length === 0) {
        throw new ApiError(400, "Please log at least one meal item.");
    }

    const newLog = await MealLog.create({
        user: userId,
        title,
        meals,
        totalCalories,
        completionPercentage: 100 // Assume 100% if logged manually
    });

    const populatedLog = await MealLog.findById(newLog._id)
        .populate("meals.foodItemId", "name calories protein carbs fat mealType");

    return res.status(201).json(
        new ApiResponse(201, "Meal logged successfully!", populatedLog)
    );
});

const getMealHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Fetch the log AND populate the nested food details
    const logs = await MealLog.find({ user: userId })
        .populate({
            path: "meals.foodItemId", // Path to the nested field
            select: "name calories protein carbs fat mealType" // Only get what you need
        })
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, "Meal history fetched", logs)
    );
});

export { logMeal, getMealHistory };
