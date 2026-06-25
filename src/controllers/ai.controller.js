import {
  generateWorkoutPlan,
  mapAIExercisesToIds,
  generateMealPlan,
  mapAIMealsToIds,
  generateAICoachResponse
} from "../services/ai.service.js";
import { Profile } from "../models/profile.model.js";
import { Bmi } from "../models/bmi.model.js";
import { WorkoutLog } from "../models/WorkoutLog.model.js";
import { MealLog } from "../models/MealLog.model.js";
import logger from "../utils/logger.js";
import asyncHandler from "../utils/async-handler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";
import { WorkoutPlan } from "../models/workoutPlan.model.js";
import { MealPlan } from "../models/MealPlan.model.js";

export const getAIWorkoutPlan = asyncHandler(async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
        throw new ApiError(404, "Profile not found");
    }

    logger.info(`AI Generation initiated for user: ${req.user._id}`);

    // 1. Get raw plan from AI
    const rawPlan = await generateWorkoutPlan(profile);

    // 2. Map AI text names to your database IDs (The missing logic)
    const enrichedSchedule = await Promise.all(
      rawPlan.schedule.map(async (day) => ({
        ...day,
        exercises: await mapAIExercisesToIds(day.exercises),
      }))
    );

    // 3. Save to database
    const savedPlan = await WorkoutPlan.create({
      user: req.user._id,
      planName: rawPlan.planName,
      schedule: enrichedSchedule,
    });

    logger.info(`AI Plan generated and saved for user: ${req.user._id}`);

    return res
      .status(200)
      .json(new ApiResponse(200, "AI Plan generated", savedPlan));
      
  } catch (error) {
    console.error(`AI Generation failed: ${error.message}`, error);
    logger.error(`AI Generation failed: ${error.message}`, {
      userId: req.user._id,
    });
    // If it's already an ApiError, rethrow it; otherwise, wrap in 500
    throw error instanceof ApiError ? error : new ApiError(500, "AI Service unavailable");
  }
});

export const getSavedWorkoutPlans = asyncHandler(async (req, res) => {
    const plans = await WorkoutPlan.find({ user: req.user._id })
        .populate("schedule.exercises.exerciseId", "name targetMuscle equipment category")
        .sort({ createdAt: -1 }); // Newest plans first

    return res.status(200).json(
        new ApiResponse(200, "Saved plans fetched successfully", plans)
    );
});

export const getAIMealPlan = asyncHandler(async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user._id });
        if (!profile) {
            throw new ApiError(404, "Profile not found");
        }

        logger.info(`AI Meal Generation initiated for user: ${req.user._id}`);

        const rawPlan = await generateMealPlan(profile);

        const enrichedSchedule = await Promise.all(
            rawPlan.schedule.map(async (day) => ({
                ...day,
                meals: await mapAIMealsToIds(day.meals),
            }))
        );

        const savedPlan = await MealPlan.create({
            user: req.user._id,
            planName: rawPlan.planName,
            schedule: enrichedSchedule,
        });

        logger.info(`AI Meal Plan generated and saved for user: ${req.user._id}`);

        return res
            .status(200)
            .json(new ApiResponse(200, "AI Meal Plan generated", savedPlan));
            
    } catch (error) {
        console.error(`AI Meal Generation failed: ${error.message}`, error);
        logger.error(`AI Meal Generation failed: ${error.message}`, {
            userId: req.user._id,
        });
        throw error instanceof ApiError ? error : new ApiError(500, "AI Service unavailable");
    }
});

export const getSavedMealPlans = asyncHandler(async (req, res) => {
    const plans = await MealPlan.find({ user: req.user._id })
        .populate("schedule.meals.foodItemId", "name calories protein carbs fat")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, "Saved meal plans fetched successfully", plans)
    );
});

export const postAIChat = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
        throw new ApiError(400, "Message is required");
    }

    try {
        // Fetch context concurrently
        const [profile, bmi, recentWorkouts, recentMeals] = await Promise.all([
            Profile.findOne({ user: userId }),
            Bmi.findOne({ user: userId }).sort({ createdAt: -1 }),
            WorkoutLog.find({ user: userId }).sort({ createdAt: -1 }).limit(3),
            MealLog.find({ user: userId }).sort({ createdAt: -1 }).limit(3)
        ]);

        const context = {
            profile: profile || {},
            bmi: bmi || {},
            recentWorkouts: recentWorkouts || [],
            recentMeals: recentMeals || []
        };

        const aiResponse = await generateAICoachResponse(message, context);

        return res.status(200).json(
            new ApiResponse(200, "AI Coach responded", { reply: aiResponse })
        );
    } catch (error) {
        logger.error(`AI Chat failed: ${error.message}`);
        throw new ApiError(500, "Failed to get AI Coach response");
    }
});