import mongoose from "mongoose";

const mealPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planName: String,
    schedule: [{
        day: String,
        meals: [{
            foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: "FoodItem" },
            name: String, // Keep text name for AI fallback
            servingSize: String,
            calories: { type: Number, min: 0 },
            protein: { type: Number, min: 0 },
            carbs: { type: Number, min: 0 },
            fat: { type: Number, min: 0 }
        }]
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const MealPlan = mongoose.model("MealPlan", mealPlanSchema);
