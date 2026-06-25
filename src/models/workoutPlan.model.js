import mongoose from "mongoose";

const workoutPlanSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    planName: String,
    schedule: [{
        day: String,
        exercises: [{
            exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "Exercise" },
            name: String, // Keep text name for AI fallback
            sets: { type: Number, min: 0 },
            reps: { type: Number, min: 0 }
        }]
    }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const WorkoutPlan = mongoose.model("WorkoutPlan", workoutPlanSchema);