import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMealLogItem {
  foodItemId: mongoose.Types.ObjectId;
  servingSize: string;
  calories?: number;
}

export interface IMealLog extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  totalCalories: number;
  meals: IMealLogItem[];
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const mealLogSchema = new Schema<IMealLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    totalCalories: {
      type: Number,
      required: true,
      min: 0,
    },
    meals: [
      {
        foodItemId: {
          type: Schema.Types.ObjectId,
          ref: "FoodItem",
          required: true,
        },
        servingSize: {
          type: String,
          default: "1 serving",
        },
        calories: {
          type: Number,
          min: 0,
        },
      },
    ],
    completionPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

mealLogSchema.index({ user: 1, createdAt: -1 });

export const MealLog: Model<IMealLog> =
  mongoose.models.MealLog || mongoose.model<IMealLog>("MealLog", mealLogSchema);

export default MealLog;
