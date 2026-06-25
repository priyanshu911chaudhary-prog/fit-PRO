import mongoose from "mongoose";
import { AvailableMealTypes, AvailableUserDietaryPreferences } from "../utils/constants.js";

const foodItemSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    calories: { 
        type: Number, 
        required: true,
        min: 0 
    },
    protein: { 
        type: Number, 
        required: true,
        min: 0 
    },
    carbs: { 
        type: Number, 
        required: true,
        min: 0 
    },
    fat: { 
        type: Number, 
        required: true,
        min: 0 
    },
    mealType: { 
        type: String, 
        required: true,
        enum: AvailableMealTypes
    },
    dietaryPreference: {
        type: String,
        enum: AvailableUserDietaryPreferences
    }
}, { timestamps: true });

export const FoodItem = mongoose.model("FoodItem", foodItemSchema);
