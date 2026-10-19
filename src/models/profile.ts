import mongoose, { Document, Model, Schema } from "mongoose";
import {
  AvailableEquipment,
  AvailableExperienceLevels,
  AvailableUserActivityLevels,
  AvailableUserDietaryPreferences,
  AvailableUserGenders,
  AvailableUserGoals,
  Equipment,
  ExperienceLevel,
  UserActivityLevel,
  UserDietaryPreference,
  UserGender,
  UserGoal,
} from "../constants";

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;
  gender: UserGender;
  dob: Date;
  age?: number;
  height: number;
  weight: number;
  fitnessGoal: UserGoal;
  activityLevel: UserActivityLevel;
  dietaryPreference: UserDietaryPreference;
  experienceLevel: ExperienceLevel;
  equipmentAvailable: Equipment[];
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    gender: {
      type: String,
      enum: AvailableUserGenders,
      default: "other",
    },
    dob: {
      type: Date,
      required: true,
    },
    age: {
      type: Number,
      min: [12, "Age must be at least 12"],
      max: [100, "Age must be at most 100"],
    },
    height: {
      type: Number,
      required: true,
      min: [50, "Height must be at least 50cm"],
      max: [250, "Height must be at most 250cm"],
    },
    weight: {
      type: Number,
      required: true,
      min: [20, "Weight must be at least 20kg"],
      max: [300, "Weight must be at most 300kg"],
    },
    fitnessGoal: {
      type: String,
      enum: AvailableUserGoals,
      default: "general_fitness",
    },
    activityLevel: {
      type: String,
      enum: AvailableUserActivityLevels,
      default: "sedentary",
    },
    dietaryPreference: {
      type: String,
      enum: AvailableUserDietaryPreferences,
      default: "none",
    },
    experienceLevel: {
      type: String,
      enum: AvailableExperienceLevels,
      default: "beginner",
    },
    equipmentAvailable: {
      type: [String],
      enum: AvailableEquipment,
      default: ["bodyweight"],
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>("Profile", profileSchema);

export default Profile;
