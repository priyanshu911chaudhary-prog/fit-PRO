import mongoose, { Document, Model, Schema } from "mongoose";

export interface INotificationPreferences extends Document {
  user: mongoose.Types.ObjectId;
  timezone: string;
  proactiveNudgesEnabled: boolean;
  achievementsEnabled: boolean;
  categories: {
    hydration: boolean;
    workout: boolean;
    nutrition: boolean;
  };
  checkInTime: string; // HH:mm format, default "18:00"
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format, default "21:00"
    end: string; // HH:mm format, default "08:00"
  };
  nextCheckInAt?: Date;
  lastCheckInDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
    },
    proactiveNudgesEnabled: {
      type: Boolean,
      default: false, // Conservative default: off until user opts in
      index: true,
    },
    achievementsEnabled: {
      type: Boolean,
      default: true, // In-app achievements enabled by default
    },
    categories: {
      hydration: { type: Boolean, default: true },
      workout: { type: Boolean, default: true },
      nutrition: { type: Boolean, default: true },
    },
    checkInTime: {
      type: String,
      default: "18:00",
      trim: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false }, // Conservative default
      push: { type: Boolean, default: false }, // Conservative default
    },
    quietHours: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "21:00", match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
      end: { type: String, default: "08:00", match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    },
    nextCheckInAt: {
      type: Date,
      index: true,
    },
    lastCheckInDate: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationPreferencesSchema.index({ proactiveNudgesEnabled: 1, nextCheckInAt: 1 });

/**
 * Returns existing notification preferences for a user, or creates default ones.
 */
export async function getOrCreateNotificationPreferences(
  userId: string | mongoose.Types.ObjectId
): Promise<INotificationPreferences> {
  let prefs = await NotificationPreferences.findOne({ user: userId });
  if (!prefs) {
    prefs = await NotificationPreferences.create({
      user: userId,
    });
  }
  return prefs;
}

export const NotificationPreferences: Model<INotificationPreferences> =
  mongoose.models.NotificationPreferences ||
  mongoose.model<INotificationPreferences>(
    "NotificationPreferences",
    notificationPreferencesSchema
  );

export default NotificationPreferences;
