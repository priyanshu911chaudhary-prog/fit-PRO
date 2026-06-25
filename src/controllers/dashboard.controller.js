import { Profile } from "../models/profile.model.js";
import { Bmi } from "../models/bmi.model.js";
import  asyncHandler  from "../utils/async-handler.js";
import  ApiResponse  from "../utils/apiResponse.js";
import ApiError  from "../utils/apiError.js";
import { getFitnessMetrics } from "../utils/fitnessCalc.js";

export const getDashboardData = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // 1. Fetch Profile and BMI history in parallel for speed
    const [profile, bmiHistory] = await Promise.all([
        Profile.findOne({ user: userId }),
        Bmi.find({ user: userId }).sort({ date: 1 }).limit(30).select("bmi weight date -_id")
    ]);

    if (!profile) {
        throw new ApiError(404, "Profile not found. Please complete onboarding.");
    }

    // 2. Calculate real-time metrics using your Fitness Engine
    const metrics = getFitnessMetrics(profile);

    // 3. Format the data for the frontend charts
    // We provide a clean, flat structure for libraries like Recharts
    const dashboardData = {
        profile: {
            goal: profile.fitnessGoal,
            isProfileComplete: profile.isProfileComplete
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