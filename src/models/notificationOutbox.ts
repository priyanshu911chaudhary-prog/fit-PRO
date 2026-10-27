import mongoose, { Document, Model, Schema } from "mongoose";

export type OutboxChannel = "email" | "push";
export type OutboxStatus = "pending" | "processing" | "sent" | "failed" | "suppressed";

export interface INotificationOutbox extends Document {
  notification: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  channel: OutboxChannel;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: Date;
  providerMessageId?: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationOutboxSchema = new Schema<INotificationOutbox>(
  {
    notification: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["email", "push"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed", "suppressed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    providerMessageId: {
      type: String,
      trim: true,
    },
    lastError: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate delivery records for the same notification and channel
notificationOutboxSchema.index(
  { notification: 1, channel: 1 },
  { unique: true }
);

// Efficient polling of pending deliveries
notificationOutboxSchema.index({ status: 1, nextAttemptAt: 1 });

export const NotificationOutbox: Model<INotificationOutbox> =
  mongoose.models.NotificationOutbox ||
  mongoose.model<INotificationOutbox>(
    "NotificationOutbox",
    notificationOutboxSchema
  );

export default NotificationOutbox;
