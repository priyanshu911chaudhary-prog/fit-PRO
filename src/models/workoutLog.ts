import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWorkoutLogExercise {
  exerciseId: mongoose.Types.ObjectId;
  sets?: number;
  reps?: number;
  weight?: number;
}

export interface IWorkoutLog extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  totalDuration: number;
  exercises: IWorkoutLogExercise[];
  completionPercentage: number;
  date?: string;
  createdAt: Date;
  updatedAt: Date;
}

const workoutLogSchema = new Schema<IWorkoutLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    totalDuration: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: String,
      index: true,
    },
    exercises: [
      {
        exerciseId: {
          type: Schema.Types.ObjectId,
          ref: "Exercise",
          required: true,
        },
        sets: {
          type: Number,
          default: 1,
          min: 0,
        },
        reps: {
          type: Number,
          default: 10,
          min: 0,
        },
        weight: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    completionPercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

workoutLogSchema.index({ user: 1, createdAt: -1 });
workoutLogSchema.index({ user: 1, date: 1 });

export const WorkoutLog: Model<IWorkoutLog> =
  mongoose.models.WorkoutLog || mongoose.model<IWorkoutLog>("WorkoutLog", workoutLogSchema);

export default WorkoutLog;
