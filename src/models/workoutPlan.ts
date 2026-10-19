import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWorkoutPlanExercise {
  exerciseId?: mongoose.Types.ObjectId | null;
  name: string;
  sets?: number;
  reps?: number;
}

export interface IWorkoutPlanDay {
  day: string;
  exercises: IWorkoutPlanExercise[];
}

export interface IWorkoutPlan extends Document {
  user: mongoose.Types.ObjectId;
  planName: string;
  schedule: IWorkoutPlanDay[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planName: {
      type: String,
      default: "AI Generated Workout Plan",
    },
    schedule: [
      {
        day: { type: String, required: true },
        exercises: [
          {
            exerciseId: {
              type: Schema.Types.ObjectId,
              ref: "Exercise",
            },
            name: { type: String, required: true },
            sets: { type: Number, default: 3, min: 0 },
            reps: { type: Number, default: 10, min: 0 },
          },
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

workoutPlanSchema.index({ user: 1, createdAt: -1 });

export const WorkoutPlan: Model<IWorkoutPlan> =
  mongoose.models.WorkoutPlan ||
  mongoose.model<IWorkoutPlan>("WorkoutPlan", workoutPlanSchema);

export default WorkoutPlan;
