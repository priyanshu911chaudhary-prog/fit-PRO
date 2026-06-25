import mongoose from "mongoose";

const mealLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    totalCalories: { type: Number, required: true, min: 0 },
    meals: [{
        foodItemId: { type: mongoose.Schema.Types.ObjectId, ref: "FoodItem", required: true },
        servingSize: String,
        calories: { type: Number, min: 0 }
    }],
    completionPercentage: { type: Number, default: 100, min: 0, max: 100 }
}, { timestamps: true });

export const MealLog = mongoose.model("MealLog", mealLogSchema);
