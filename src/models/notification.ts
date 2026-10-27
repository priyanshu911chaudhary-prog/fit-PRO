import mongoose, { Document, Model, Schema } from "mongoose";

export type NotificationType =
  | "hydration_nudge"
  | "workout_nudge"
  | "nutrition_nudge"
  | "hydration_goal"
  | "protein_goal"
  | "workout_progress"
  | "custom";

export type NotificationCategory = "hydration" | "workout" | "nutrition" | "general";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  destinationUrl: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  readAt?: Date | null;
  clickedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["hydration", "workout", "nutrition", "general"],
      default: "general",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    destinationUrl: {
      type: String,
      default: "/dashboard",
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    dedupeKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    clickedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user queries
notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", notificationSchema);

export default Notification;
