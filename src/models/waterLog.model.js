import mongoose from "mongoose";

const waterLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    amountMl: {
        type: Number,
        required: true,
        min: 1
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

export const WaterLog = mongoose.model("WaterLog", waterLogSchema);
