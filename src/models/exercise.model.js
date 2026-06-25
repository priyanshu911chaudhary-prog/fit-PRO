import mongoose from "mongoose";
import { 
    AvailableExerciseCategories, 
    AvailableMuscleGroups, 
    AvailableEquipment 
} from "../utils/constants.js";

const exerciseSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    targetMuscle: { 
        type: String, 
        required: true, 
        enum: AvailableMuscleGroups // Validates against constants.js
    }, 
    equipment: { 
        type: String, 
        required: true,
        enum: AvailableEquipment // Validates against constants.js
    }, 
    category: { 
        type: String, 
        required: true,
        enum: AvailableExerciseCategories // Validates against constants.js
    }
}, { timestamps: true });

export const Exercise = mongoose.model("Exercise", exerciseSchema);