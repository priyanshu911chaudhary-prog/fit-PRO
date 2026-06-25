import mongoose from "mongoose";
import {AvailableUserWeightPreferences} from "../utils/constants.js";

const bmiSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true 
        },
        weight: {
            type: Number, // Stored in kg at the time of calculation
            required: true,
        },
        height: {
            type: Number, // Stored in cm at the time of calculation
            required: true,
        },
        bmi: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            enum: AvailableUserWeightPreferences,
            required: true,
            default: "normal"
        },
        date: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    { 
        timestamps: true 
    }
);

export const Bmi = mongoose.model("Bmi", bmiSchema);