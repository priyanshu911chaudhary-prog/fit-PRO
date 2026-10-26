import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWeeklyLeaderboardEntry extends Document {
  user: mongoose.Types.ObjectId;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  scoreBasisPoints: number; // 0 - 10000
  displayScore: number; // 0 - 100
  workoutComponent: number; // 0.0 - 1.0
  proteinComponent: number; // 0.0 - 1.0
  hydrationComponent: number; // 0.0 - 1.0
  qualifyingWorkoutsCount: number;
  trackedDaysCount: number; // 0 - 7
  isEligible: boolean;
  ineligibilityReason?: string;
  targetSnapshot: {
    weeklyWorkoutGoal: number;
    dailyProteinTarget: number;
    dailyHydrationTarget: number;
  };
  displayNameSnapshot: string;
  scoringVersion: number;
  isFinalized: boolean;
  computedAt: Date;
  finalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyLeaderboardEntrySchema = new Schema<IWeeklyLeaderboardEntry>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weekStart: {
      type: String,
      required: true,
      index: true,
    },
    weekEnd: {
      type: String,
      required: true,
    },
    scoreBasisPoints: {
      type: Number,
      required: true,
      min: 0,
      max: 10000,
      index: true,
    },
    displayScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    workoutComponent: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    proteinComponent: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    hydrationComponent: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    qualifyingWorkoutsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    trackedDaysCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 7,
    },
    isEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    ineligibilityReason: {
      type: String,
    },
    targetSnapshot: {
      weeklyWorkoutGoal: { type: Number, required: true },
      dailyProteinTarget: { type: Number, required: true },
      dailyHydrationTarget: { type: Number, required: true },
    },
    displayNameSnapshot: {
      type: String,
      default: "Athlete",
    },
    scoringVersion: {
      type: Number,
      default: 1,
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    computedAt: {
      type: Date,
      default: Date.now,
    },
    finalizedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one score record per user per week
weeklyLeaderboardEntrySchema.index({ user: 1, weekStart: 1 }, { unique: true });

// Compound query index for fetching leaderboard rankings
weeklyLeaderboardEntrySchema.index({ weekStart: 1, isEligible: 1, scoreBasisPoints: -1 });

export const WeeklyLeaderboardEntry: Model<IWeeklyLeaderboardEntry> =
  mongoose.models.WeeklyLeaderboardEntry ||
  mongoose.model<IWeeklyLeaderboardEntry>("WeeklyLeaderboardEntry", weeklyLeaderboardEntrySchema);

export default WeeklyLeaderboardEntry;
