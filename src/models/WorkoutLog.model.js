import mongoose from "mongoose";

const workoutLogSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    totalDuration: { type: Number, required: true, min: 0 },
    exercises: [{
        exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise", required: true },
        sets: { type: Number, min: 0 },
        reps: { type: Number, min: 0 },
        weight: { type: Number, min: 0 }
    }],
    completionPercentage: { type: Number, default: 100, min: 0, max: 100 }
}, { timestamps: true });

export const WorkoutLog = mongoose.model("WorkoutLog", workoutLogSchema);