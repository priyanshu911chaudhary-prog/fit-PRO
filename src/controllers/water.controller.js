import { WaterLog } from "../models/waterLog.model.js";
import asyncHandler from "../utils/async-handler.js";
import ApiResponse from "../utils/apiResponse.js";
import ApiError from "../utils/apiError.js";

export const addWater = asyncHandler(async (req, res) => {
    const { amountMl } = req.body;
    const userId = req.user._id;

    if (!amountMl || amountMl <= 0) {
        throw new ApiError(400, "Amount in ml is required and must be greater than 0");
    }

    const waterLog = await WaterLog.create({
        user: userId,
        amountMl
    });

    return res.status(201).json(
        new ApiResponse(201, "Water intake logged successfully", waterLog)
    );
});

export const getTodayWaterIntake = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await WaterLog.find({
        user: userId,
        date: {
            $gte: startOfDay,
            $lte: endOfDay
        }
    });

    const totalMl = logs.reduce((sum, log) => sum + log.amountMl, 0);

    return res.status(200).json(
        new ApiResponse(200, "Today's water intake fetched successfully", { totalMl, logs })
    );
});
