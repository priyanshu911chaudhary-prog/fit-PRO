import { z } from "zod";
import { 
    AvailableUserGenders, 
    AvailableUserGoals, 
    AvailableUserActivityLevels, 
    AvailableUserDietaryPreferences 
} from "../utils/constants.js";

export const profileSetupValidator = z.object({
    gender: z.enum(AvailableUserGenders, { 
        required_error: "Gender is required",
        invalid_type_error: "Invalid gender selection"
    }),
    dob: z.coerce.date({
        required_error: "Date of birth is required",
        invalid_type_error: "Invalid date format"
    }),
    age: z.number()
        .min(12, "Age must be at least 12")
        .max(100, "Age must be less than or equal to 100"),
    height: z.number({ required_error: "Height is required" })
        .min(50, "Height must be at least 50cm")
        .max(250, "Height must be at most 250cm"),
    weight: z.number({ required_error: "Weight is required" })
        .min(20, "Weight must be at least 20kg")
        .max(300, "Weight must be at most 300kg"),
    fitnessGoal: z.enum(AvailableUserGoals, {
        required_error: "Fitness goal is required"
    }),
    activityLevel: z.enum(AvailableUserActivityLevels, {
        required_error: "Activity level is required"
    }),
    dietaryPreference: z.enum(AvailableUserDietaryPreferences, {
        required_error: "Dietary preference is required"
    })
});