import { z } from "zod";
import {
  AvailableEquipment,
  AvailableExperienceLevels,
  AvailableUserActivityLevels,
  AvailableUserDietaryPreferences,
  AvailableUserGenders,
  AvailableUserGoals,
  Equipment,
  ExperienceLevel,
  UserActivityLevel,
  UserDietaryPreference,
  UserGender,
  UserGoal,
} from "../constants";

const genderTuple = AvailableUserGenders as unknown as [UserGender, ...UserGender[]];
const goalTuple = AvailableUserGoals as unknown as [UserGoal, ...UserGoal[]];
const activityTuple = AvailableUserActivityLevels as unknown as [UserActivityLevel, ...UserActivityLevel[]];
const dietaryTuple = AvailableUserDietaryPreferences as unknown as [UserDietaryPreference, ...UserDietaryPreference[]];
const experienceTuple = AvailableExperienceLevels as unknown as [ExperienceLevel, ...ExperienceLevel[]];
const equipmentTuple = AvailableEquipment as unknown as [Equipment, ...Equipment[]];

export const profileSetupSchema = z.object({
  gender: z.enum(genderTuple),
  dob: z.coerce.date(),
  age: z
    .number()
    .min(12, "Age must be at least 12")
    .max(100, "Age must be less than or equal to 100")
    .optional(),
  height: z
    .number()
    .min(50, "Height must be at least 50cm")
    .max(250, "Height must be at most 250cm"),
  weight: z
    .number()
    .min(20, "Weight must be at least 20kg")
    .max(300, "Weight must be at most 300kg"),
  fitnessGoal: z.enum(goalTuple),
  activityLevel: z.enum(activityTuple).default("sedentary"),
  dietaryPreference: z.enum(dietaryTuple).default("none"),
  experienceLevel: z.enum(experienceTuple).default("beginner"),
  equipmentAvailable: z.array(z.enum(equipmentTuple)).default(["bodyweight"]),
});

export const profileUpdateSchema = profileSetupSchema.partial();

export type ProfileSetupInput = z.infer<typeof profileSetupSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
