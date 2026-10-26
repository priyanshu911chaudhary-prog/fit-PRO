import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILeaderboardWeekStatus extends Document {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Next Monday)
  isFinalized: boolean;
  finalizedAt?: Date;
  totalParticipants?: number;
  eligibleParticipants?: number;
  createdAt: Date;
  updatedAt: Date;
}

const leaderboardWeekStatusSchema = new Schema<ILeaderboardWeekStatus>(
  {
    weekStart: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    weekEnd: {
      type: String,
      required: true,
    },
    isFinalized: {
      type: Boolean,
      default: false,
      index: true,
    },
    finalizedAt: {
      type: Date,
    },
    totalParticipants: {
      type: Number,
      default: 0,
    },
    eligibleParticipants: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const LeaderboardWeekStatus: Model<ILeaderboardWeekStatus> =
  mongoose.models.LeaderboardWeekStatus ||
  mongoose.model<ILeaderboardWeekStatus>("LeaderboardWeekStatus", leaderboardWeekStatusSchema);

export default LeaderboardWeekStatus;
