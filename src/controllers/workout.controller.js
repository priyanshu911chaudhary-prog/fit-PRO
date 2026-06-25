import {WorkoutLog} from "../models/WorkoutLog.model.js";
import "../models/exercise.model.js"; // Ensure Exercise model is loaded for population
import asyncHandler from "../utils/async-handler.js";
import  ApiResponse  from "../utils/apiResponse.js";
import  ApiError  from "../utils/apiError.js";

const logWorkout = asyncHandler(async (req, res) => {
    const { title, exercises, totalDuration } = req.body;
    const userId = req.user._id;

    // Validate incoming exercise data
    if (!exercises || exercises.length === 0) {
        throw new ApiError(400, "Please log at least one exercise.");
    }

    const newLog = await WorkoutLog.create({
        user: userId,
        title,
        exercises,
        totalDuration,
        completionPercentage: 100 // Assume 100% if logged manually
    });

    const populatedLog = await WorkoutLog.findById(newLog._id)
        .populate("exercises.exerciseId", "name targetMuscle category");

    return res.status(201).json(
        new ApiResponse(201, "Workout logged successfully!", populatedLog)
    );
});

const getWorkoutHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Fetch the log AND populate the nested exercise details
    const logs = await WorkoutLog.find({ user: userId })
        .populate({
            path: "exercises.exerciseId", // Path to the nested field
            select: "name targetMuscle category" // Only get what you need
        })
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, "History fetched", logs)
    );
});

export { logWorkout, getWorkoutHistory };