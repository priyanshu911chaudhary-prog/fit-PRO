import mongoose, { Document, Model, Schema } from "mongoose";
import {
  AvailableEquipment,
  AvailableExerciseCategories,
  AvailableMuscleGroups,
  Equipment,
  ExerciseCategory,
  MuscleGroup,
} from "../constants";

export interface IExercise extends Document {
  name: string;
  targetMuscle: MuscleGroup;
  equipment: Equipment;
  category: ExerciseCategory;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: {
      type: String,
      required: [true, "Exercise name is required"],
      unique: true,
      trim: true,
      index: true,
    },
    targetMuscle: {
      type: String,
      required: true,
      enum: AvailableMuscleGroups,
      index: true,
    },
    equipment: {
      type: String,
      required: true,
      enum: AvailableEquipment,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: AvailableExerciseCategories,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Exercise: Model<IExercise> =
  mongoose.models.Exercise || mongoose.model<IExercise>("Exercise", exerciseSchema);

export default Exercise;
