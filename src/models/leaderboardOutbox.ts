import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILeaderboardOutbox extends Document {
  user: mongoose.Types.ObjectId;
  weekStart: string;
  attempts: number;
  lastError?: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const leaderboardOutboxSchema = new Schema<ILeaderboardOutbox>(
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
    attempts: {
      type: Number,
      default: 0,
    },
    lastError: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to coalesce duplicate jobs for the same user and week
leaderboardOutboxSchema.index({ user: 1, weekStart: 1, status: 1 });

export const LeaderboardOutbox: Model<ILeaderboardOutbox> =
  mongoose.models.LeaderboardOutbox ||
  mongoose.model<ILeaderboardOutbox>("LeaderboardOutbox", leaderboardOutboxSchema);

export default LeaderboardOutbox;
