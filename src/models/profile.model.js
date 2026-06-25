import mongoose from "mongoose";
import { AvailableUserGenders } from "../utils/constants.js";
import { AvailableUserGoals } from "../utils/constants.js";
import { AvailableUserActivityLevels } from "../utils/constants.js";
import {AvailableUserDietaryPreferences} from "../utils/constants.js";

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    gender: {
      type: String,
      enum: AvailableUserGenders,
      default: "other",
    },
    dob: {
      type: Date,
    },
    age: {
      type: Number,
      min: [12, "Age must be at least 12"],
      max: [100, "Age must be less than or equal to 100"],
    },
    height: {
      type: Number,
      min: [50, "Height must be at least 50"],
      max: [250, "Height must be less than or equal to 250"],
    },
    weight: {
      type: Number,
      min: [20, "Weight must be at least 20"],
      max: [300, "Weight must be less than or equal to 300"],
    },
    fitnessGoal: {
      type: String,
      enum: AvailableUserGoals,
      default: "general_fitness",
    },
    activityLevel: {
      type: String,
      enum: AvailableUserActivityLevels,
      default: "SEDENTARY",
    },
    dietaryPreference: {
      type: String,
      enum: AvailableUserDietaryPreferences,
      default: "none",
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Profile = mongoose.model("Profile", profileSchema);
