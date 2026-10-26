import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILeaderboardSettings extends Document {
  user: mongoose.Types.ObjectId;
  optIn: boolean;
  displayName: string;
  weeklyWorkoutGoal: number; // default 3, range 1-14
  dailyProteinTarget: number; // default 120g, range 30-350
  dailyHydrationTarget: number; // default 2500ml, range 1000-6000
  pendingWeeklyWorkoutGoal?: number;
  pendingDailyProteinTarget?: number;
  pendingDailyHydrationTarget?: number;
  pendingGoalsEffectiveWeekStart?: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

const leaderboardSettingsSchema = new Schema<ILeaderboardSettings>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    optIn: {
      type: Boolean,
      default: false,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    weeklyWorkoutGoal: {
      type: Number,
      default: 3,
      min: 1,
      max: 14,
    },
    dailyProteinTarget: {
      type: Number,
      default: 120,
      min: 30,
      max: 350,
    },
    dailyHydrationTarget: {
      type: Number,
      default: 2500,
      min: 1000,
      max: 6000,
    },
    pendingWeeklyWorkoutGoal: {
      type: Number,
      min: 1,
      max: 14,
    },
    pendingDailyProteinTarget: {
      type: Number,
      min: 30,
      max: 350,
    },
    pendingDailyHydrationTarget: {
      type: Number,
      min: 1000,
      max: 6000,
    },
    pendingGoalsEffectiveWeekStart: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const LeaderboardSettings: Model<ILeaderboardSettings> =
  mongoose.models.LeaderboardSettings ||
  mongoose.model<ILeaderboardSettings>("LeaderboardSettings", leaderboardSettingsSchema);

export default LeaderboardSettings;
