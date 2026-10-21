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
  mealType?: MealType | string;
  dietaryPreference?: UserDietaryPreference;
  servingBasis: "per_100g" | "per_100ml" | "per_piece" | "per_slice" | "per_serving";
  servingUnit: string;
  defaultQuantity: number;
  pieceWeightG?: number;
  servingWeightG?: number;
  category: string;
  aliases: string[];
  state: "raw" | "cooked" | "prepared" | "packaged";
  source?: string;
  isActive: boolean;
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
      enum: [...AvailableMealTypes, "any"],
      default: "any",
      index: true,
    },
    dietaryPreference: {
      type: String,
      enum: AvailableUserDietaryPreferences,
      default: "none",
      index: true,
    },
    servingBasis: {
      type: String,
      enum: ["per_100g", "per_100ml", "per_piece", "per_slice", "per_serving"],
      default: "per_100g",
    },
    servingUnit: {
      type: String,
      default: "g",
    },
    defaultQuantity: {
      type: Number,
      default: 100,
      min: 0.01,
    },
    pieceWeightG: {
      type: Number,
      min: 0,
    },
    servingWeightG: {
      type: Number,
      min: 0,
    },
    category: {
      type: String,
      default: "prepared",
      index: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    state: {
      type: String,
      enum: ["raw", "cooked", "prepared", "packaged"],
      default: "raw",
    },
    source: {
      type: String,
      default: "USDA / IFCT",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

foodItemSchema.index({ name: 1, category: 1, isActive: 1 });

export const FoodItem: Model<IFoodItem> =
  mongoose.models.FoodItem || mongoose.model<IFoodItem>("FoodItem", foodItemSchema);

export default FoodItem;
