import mongoose, { Document, Model, Schema } from "mongoose";
import {
  AvailableMealTypes,
  AvailableUserDietaryPreferences,
  MealType,
  UserDietaryPreference,
} from "../constants";

export interface IFoodItem extends Document {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  dietaryPreference?: UserDietaryPreference;
  createdAt: Date;
  updatedAt: Date;
}

const foodItemSchema = new Schema<IFoodItem>(
  {
    name: {
      type: String,
      required: [true, "Food name is required"],
      unique: true,
      trim: true,
      index: true,
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
    },
    carbs: {
      type: Number,
      required: true,
      min: 0,
    },
    fat: {
      type: Number,
      required: true,
      min: 0,
    },
    mealType: {
      type: String,
      required: true,
      enum: AvailableMealTypes,
      index: true,
    },
    dietaryPreference: {
      type: String,
      enum: AvailableUserDietaryPreferences,
      default: "none",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const FoodItem: Model<IFoodItem> =
  mongoose.models.FoodItem || mongoose.model<IFoodItem>("FoodItem", foodItemSchema);

export default FoodItem;
