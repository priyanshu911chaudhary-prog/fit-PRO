import { Profile } from "../models/profile.model.js";
import { Bmi } from "../models/bmi.model.js";
import { WorkoutLog } from "../models/WorkoutLog.model.js";
import  asyncHandler  from "../utils/async-handler.js";
import  ApiResponse  from "../utils/apiResponse.js";
import ApiError  from "../utils/apiError.js";
import { getFitnessMetrics } from "../utils/fitnessCalc.js";

export const getDashboardData = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1. Fetch Profile, BMI, and Workout history in parallel
    const [profile, bmiHistory, workoutLogs] = await Promise.all([
        Profile.findOne({ user: userId }),
        Bmi.find({ user: userId }).sort({ date: 1 }).limit(30).select("bmi weight date -_id"),
        WorkoutLog.find({ user: userId }).sort({ createdAt: -1 }).select("createdAt")
    ]);

    if (!profile) {
        throw new ApiError(404, "Profile not found. Please complete onboarding.");
    }

    // Calculate Workout Streak
    let streak = 0;
    if (workoutLogs && workoutLogs.length > 0) {
        const dates = [...new Set(workoutLogs.map(log => log.createdAt.toISOString().split('T')[0]))];
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let checkDate = new Date(today);
        const firstDate = new Date(dates[0]);
        firstDate.setHours(0,0,0,0);

        if (firstDate.getTime() === checkDate.getTime()) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
            dates.shift(); // remove today
        } else if (firstDate.getTime() === checkDate.getTime() - 86400000) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        for (const dateStr of dates) {
            const logDate = new Date(dateStr);
            logDate.setHours(0,0,0,0);
            if (logDate.getTime() === checkDate.getTime()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
    }

    // 2. Calculate real-time metrics using your Fitness Engine
    const metrics = getFitnessMetrics(profile);

    // 3. Format the data for the frontend charts
    // We provide a clean, flat structure for libraries like Recharts
    const dashboardData = {
        profile: {
            goal: profile.fitnessGoal,
            isProfileComplete: profile.isProfileComplete,
            streak // <--- Gamification injected here
        },
        currentMetrics: metrics, // BMI, BMR, TDEE
        charts: {
            weightTrend: bmiHistory.map(entry => ({
                date: entry.date.toISOString().split('T')[0],
                weight: entry.weight
            })),
            bmiTrend: bmiHistory.map(entry => ({
                date: entry.date.toISOString().split('T')[0],
                bmi: entry.bmi
            }))
        }
    };

    return res.status(200).json(
        new ApiResponse(200, "Dashboard data retrieved successfully", dashboardData)
    );
});