import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMealPlanItem {
  foodItemId?: mongoose.Types.ObjectId | null;
  name: string;
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface IMealPlanDay {
  day: string;
  meals: IMealPlanItem[];
}

export interface IMealPlan extends Document {
  user: mongoose.Types.ObjectId;
  planName: string;
  schedule: IMealPlanDay[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mealPlanSchema = new Schema<IMealPlan>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    planName: {
      type: String,
      default: "AI Generated Meal Plan",
    },
    schedule: [
      {
        day: { type: String, required: true },
        meals: [
          {
            foodItemId: {
              type: Schema.Types.ObjectId,
              ref: "FoodItem",
            },
            name: { type: String, required: true },
            servingSize: { type: String, default: "1 serving" },
            calories: { type: Number, min: 0 },
            protein: { type: Number, min: 0 },
            carbs: { type: Number, min: 0 },
            fat: { type: Number, min: 0 },
          },
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

mealPlanSchema.index({ user: 1, createdAt: -1 });
mealPlanSchema.index(
  { user: 1, isActive: 1 },
  {
    unique: true,
    name: "user_single_active_meal_plan",
    partialFilterExpression: { isActive: true },
  }
);

export const MealPlan: Model<IMealPlan> =
  mongoose.models.MealPlan || mongoose.model<IMealPlan>("MealPlan", mealPlanSchema);

export default MealPlan;
