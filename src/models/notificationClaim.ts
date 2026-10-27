import mongoose, { Model, Schema } from "mongoose";

export type NotificationClaimType = "checkin" | "achievement" | "external_delivery";

export interface INotificationClaim {
  _id: string; // ${userId}:${localDate}:${claimType}:${slotNumber}
  user: mongoose.Types.ObjectId;
  localDate: string; // YYYY-MM-DD
  claimType: NotificationClaimType;
  slotNumber: number;
  notification?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const notificationClaimSchema = new Schema<INotificationClaim>(
  {
    _id: {
      type: String,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    localDate: {
      type: String,
      required: true,
      index: true,
    },
    claimType: {
      type: String,
      enum: ["checkin", "achievement", "external_delivery"],
      required: true,
      index: true,
    },
    slotNumber: {
      type: Number,
      required: true,
    },
    notification: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30 * 24 * 60 * 60, // TTL: automatically remove claims older than 30 days
    },
  },
  {
    _id: false, // Use our explicit string _id
    timestamps: false,
  }
);

export const NotificationClaim: Model<INotificationClaim> =
  mongoose.models.NotificationClaim ||
  mongoose.model<INotificationClaim>("NotificationClaim", notificationClaimSchema);

/**
 * Atomically claims a deterministic daily notification quota slot in MongoDB.
 * Completely eliminates TOCTOU (time-of-check to time-of-use) race conditions across concurrent workers.
 *
 * @returns { claimed: true, slotNumber } if claimed or already claimed by this notification.
 * @returns { claimed: false } if the quota for that slotType has been exhausted for the localDate.
 */
export async function claimNotificationSlot(params: {
  userId: string;
  localDate: string;
  claimType: NotificationClaimType;
  maxSlots: number;
  notificationId?: string;
}): Promise<{ claimed: boolean; slotNumber?: number }> {
  const { userId, localDate, claimType, maxSlots, notificationId } = params;

  for (let slot = 1; slot <= maxSlots; slot++) {
    const claimId = `${userId}:${localDate}:${claimType}:${slot}`;

    try {
      await NotificationClaim.create({
        _id: claimId,
        user: new mongoose.Types.ObjectId(userId),
        localDate,
        claimType,
        slotNumber: slot,
        notification: notificationId ? new mongoose.Types.ObjectId(notificationId) : undefined,
      });

      return { claimed: true, slotNumber: slot };
    } catch (err: unknown) {
      const mongoError = err as { code?: number };
      if (mongoError?.code === 11000) {
        // Slot already exists. Check if it was claimed by the same notification (idempotency)
        if (notificationId) {
          const existing = await NotificationClaim.findById(claimId);
          if (existing?.notification?.toString() === notificationId) {
            return { claimed: true, slotNumber: slot };
          }
        }
        // Slot is taken by another notification. Try next slot.
        continue;
      }
      throw err;
    }
  }

  // All slots 1..maxSlots are occupied by other notifications
  return { claimed: false };
}
