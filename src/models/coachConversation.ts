import mongoose, { Document, Model, Schema } from "mongoose";
import { AvailableChatRoles, ChatRole } from "../constants";

export interface ICoachMessage {
  _id?: mongoose.Types.ObjectId;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

export interface ICoachConversation extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  messages: ICoachMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const coachMessageSchema = new Schema<ICoachMessage>(
  {
    role: {
      type: String,
      enum: AvailableChatRoles,
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const coachConversationSchema = new Schema<ICoachConversation>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
      maxlength: 120,
      trim: true,
    },
    messages: [coachMessageSchema],
  },
  {
    timestamps: true,
  }
);

coachConversationSchema.index({ user: 1, updatedAt: -1 });

export const CoachConversation: Model<ICoachConversation> =
  mongoose.models.CoachConversation ||
  mongoose.model<ICoachConversation>("CoachConversation", coachConversationSchema);

export default CoachConversation;
