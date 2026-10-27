import mongoose, { Document, Model, Schema } from "mongoose";

export type EmailTemplateType = "verification" | "password-reset" | "custom";
export type EmailOutboxStatus = "pending" | "processing" | "sent" | "failed";

export interface IEmailOutbox extends Document {
  recipientEmail: string;
  subject: string;
  template: EmailTemplateType;
  encryptedPayload: string; // AES-256-GCM encrypted string: iv:ciphertext:tag
  status: EmailOutboxStatus;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailOutboxSchema = new Schema<IEmailOutbox>(
  {
    recipientEmail: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    template: {
      type: String,
      enum: ["verification", "password-reset", "custom"],
      required: true,
      index: true,
    },
    encryptedPayload: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "failed"],
      default: "pending",
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastError: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for recovery polling and deduplication inspection
emailOutboxSchema.index({ status: 1, attempts: 1, createdAt: 1 });
emailOutboxSchema.index({ recipientEmail: 1, template: 1, createdAt: -1 });

export const EmailOutbox: Model<IEmailOutbox> =
  mongoose.models.EmailOutbox ||
  mongoose.model<IEmailOutbox>("EmailOutbox", emailOutboxSchema);

export default EmailOutbox;
