import mongoose, { Document, Model, Schema } from "mongoose";
import { AvailableUserWeightPreferences, UserWeightPreference } from "../constants";

export interface IBmi extends Document {
  user: mongoose.Types.ObjectId;
  weight: number;
  height: number;
  bmi: number;
  category: UserWeightPreference;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bmiSchema = new Schema<IBmi>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      required: true,
      min: 20,
      max: 300,
    },
    height: {
      type: Number,
      required: true,
      min: 50,
      max: 250,
    },
    bmi: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: AvailableUserWeightPreferences,
      required: true,
      default: "normal",
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

bmiSchema.index({ user: 1, date: -1 });

export const Bmi: Model<IBmi> =
  mongoose.models.Bmi || mongoose.model<IBmi>("Bmi", bmiSchema);

export default Bmi;
