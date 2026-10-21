import mongoose, { Document, Model, Schema } from "mongoose";
import { formatInTimezone } from "@/lib/timezone";

export interface IMealLogItem {
  foodItemId: mongoose.Types.ObjectId;
  name?: string;
  quantity?: number;
  unit?: string;
  servingSize: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface IMealLog extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  consumedDate: string; // Canonical date string: YYYY-MM-DD
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
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
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      default: "snack",
      index: true,
    },
    consumedDate: {
      type: String,
      index: true,
      default: () => new Date().toISOString().slice(0, 10),
    },
    totalCalories: {
      type: Number,
      required: true,
      min: 0,
    },
    totalProtein: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCarbs: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFat: {
      type: Number,
      default: 0,
      min: 0,
    },
    meals: [
      {
        foodItemId: {
          type: Schema.Types.ObjectId,
          ref: "FoodItem",
          required: true,
        },
        name: {
          type: String,
          trim: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 0,
        },
        unit: {
          type: String,
          default: "serving",
        },
        servingSize: {
          type: String,
          default: "1 serving",
        },
        calories: {
          type: Number,
          default: 0,
          min: 0,
        },
        protein: {
          type: Number,
          default: 0,
          min: 0,
        },
        carbs: {
          type: Number,
          default: 0,
          min: 0,
        },
        fat: {
          type: Number,
          default: 0,
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

mealLogSchema.index({ user: 1, consumedDate: 1 });
mealLogSchema.index({ user: 1, createdAt: -1 });

// Ensure legacy compatibility in hooks
mealLogSchema.pre("validate", function () {
  if (!this.consumedDate) {
    const d = this.createdAt ? new Date(this.createdAt) : new Date();
    this.consumedDate = formatInTimezone(d, "Asia/Kolkata");
  }
  if (!this.mealType && this.title) {
    const lower = this.title.toLowerCase();
    if (["breakfast", "lunch", "dinner", "snack"].includes(lower)) {
      this.mealType = lower as "breakfast" | "lunch" | "dinner" | "snack";
    } else {
      this.mealType = "snack";
    }
  }
});

export const MealLog: Model<IMealLog> =
  mongoose.models.MealLog || mongoose.model<IMealLog>("MealLog", mealLogSchema);

export default MealLog;
