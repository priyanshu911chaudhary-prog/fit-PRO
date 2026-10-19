import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWaterLog extends Document {
  user: mongoose.Types.ObjectId;
  amountMl: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const waterLogSchema = new Schema<IWaterLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amountMl: {
      type: Number,
      required: true,
      min: 1,
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

waterLogSchema.index({ user: 1, date: -1 });

export const WaterLog: Model<IWaterLog> =
  mongoose.models.WaterLog || mongoose.model<IWaterLog>("WaterLog", waterLogSchema);

export default WaterLog;
