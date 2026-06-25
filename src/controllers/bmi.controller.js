import {Bmi} from "../models/bmi.model.js";
import {Profile} from "../models/profile.model.js";
import asyncHandler from "../utils/async-handler.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import { calculateBMI } from "../utils/fitnessCalc.js";

const logBmi=asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { weight, height } = req.body;

    // Validate weight and height
    if (!weight || !height) {
        throw new ApiError(400, "Weight and height are required.");
    }

    const { bmi, category } = calculateBMI(weight, height);

    // Create a new BMI record
    const bmiRecord = new Bmi({
        user: userId,
        weight,
        height,
        bmi,
        category,
        date: new Date()
    });

    await bmiRecord.save();

    await Profile.findOneAndUpdate(
        {
            user: userId
        },
        {
            weight,
            height
        },
        {
            runvalidators: true,
        }
    );


    return res.status(201).json(
        new ApiResponse(201, "BMI logged successfully.", bmiRecord)
    );
});

const getBmiHistory=asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const history=await Bmi.find({ user: userId })
        .sort({ date: -1 })
        .limit(10)
        .select("weight height bmi category date -_id"); // Exclude _id for cleaner response

    if (!history || history.length === 0) {
        throw new ApiError(404, "No BMI history found for this user.");
    }

    const chartData = history.map(entry => ({
        date: entry.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        bmi: entry.bmi,
        weight: entry.weight,
        category: entry.category
    }));

    return res.status(200).json(
        new ApiResponse(200, "BMI history retrieved successfully.", chartData)
    );
});

export { logBmi, getBmiHistory };