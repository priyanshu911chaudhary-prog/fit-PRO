export const UserGenderEnum = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
} as const;

export type UserGender = (typeof UserGenderEnum)[keyof typeof UserGenderEnum];
export const AvailableUserGenders = Object.values(UserGenderEnum);

export const UserGoalEnum = {
  WEIGHT_LOSS: "weight_loss",
  WEIGHT_GAIN: "weight_gain",
  MUSCLE_BUILDING: "muscle_building",
  MAINTAIN_WEIGHT: "maintain_weight",
  ENDURANCE_TRAINING: "endurance_training",
  STRENGTH_TRAINING: "strength_training",
  FLEXIBILITY_TRAINING: "flexibility_training",
  GENERAL_FITNESS: "general_fitness",
} as const;

export type UserGoal = (typeof UserGoalEnum)[keyof typeof UserGoalEnum];
export const AvailableUserGoals = Object.values(UserGoalEnum);

export const UserActivityLevelEnum = {
  SEDENTARY: "sedentary",
  LIGHTLY_ACTIVE: "lightly_active",
  MODERATELY_ACTIVE: "moderately_active",
  VERY_ACTIVE: "very_active",
  SUPER_ACTIVE: "super_active",
} as const;

export type UserActivityLevel = (typeof UserActivityLevelEnum)[keyof typeof UserActivityLevelEnum];
export const AvailableUserActivityLevels = Object.values(UserActivityLevelEnum);

export const UserDietaryPreferenceEnum = {
  VEGETARIAN: "vegetarian",
  VEGAN: "vegan",
  PESCATARIAN: "pescatarian",
  KETOGENIC: "ketogenic",
  PALEO: "paleo",
  MEDITERRANEAN: "mediterranean",
  LOW_CARB: "low_carb",
  LOW_FAT: "low_fat",
  NONE: "none",
} as const;

export type UserDietaryPreference =
  (typeof UserDietaryPreferenceEnum)[keyof typeof UserDietaryPreferenceEnum];
export const AvailableUserDietaryPreferences = Object.values(UserDietaryPreferenceEnum);

export const UserWeightPreferenceEnum = {
  UNDERWEIGHT: "underweight",
  NORMAL: "normal",
  OVERWEIGHT: "overweight",
  OBESE: "obese",
} as const;

export type UserWeightPreference =
  (typeof UserWeightPreferenceEnum)[keyof typeof UserWeightPreferenceEnum];
export const AvailableUserWeightPreferences = Object.values(UserWeightPreferenceEnum);

export const ExerciseCategoryEnum = {
  STRENGTH: "strength",
  CARDIO: "cardio",
  FLEXIBILITY: "flexibility",
} as const;

export type ExerciseCategory =
  (typeof ExerciseCategoryEnum)[keyof typeof ExerciseCategoryEnum];
export const AvailableExerciseCategories = Object.values(ExerciseCategoryEnum);

export const MuscleGroupEnum = {
  CHEST: "chest",
  BACK: "back",
  LEGS: "legs",
  SHOULDERS: "shoulders",
  ARMS: "arms",
  CORE: "core",
  FULL_BODY: "full_body",
} as const;

export type MuscleGroup = (typeof MuscleGroupEnum)[keyof typeof MuscleGroupEnum];
export const AvailableMuscleGroups = Object.values(MuscleGroupEnum);

export const EquipmentEnum = {
  BODYWEIGHT: "bodyweight",
  DUMBBELL: "dumbbell",
  BARBELL: "barbell",
  MACHINE: "machine",
  CABLE: "cable",
  OTHER: "other",
} as const;

export type Equipment = (typeof EquipmentEnum)[keyof typeof EquipmentEnum];
export const AvailableEquipment = Object.values(EquipmentEnum);

export const MealTypeEnum = {
  BREAKFAST: "breakfast",
  LUNCH: "lunch",
  DINNER: "dinner",
  SNACK: "snack",
} as const;

export type MealType = (typeof MealTypeEnum)[keyof typeof MealTypeEnum];
export const AvailableMealTypes = Object.values(MealTypeEnum);

export const ExperienceLevelEnum = {
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
} as const;

export type ExperienceLevel = (typeof ExperienceLevelEnum)[keyof typeof ExperienceLevelEnum];
export const AvailableExperienceLevels = Object.values(ExperienceLevelEnum);

export const ActivityMultipliers: Record<UserActivityLevel, number> = {
  [UserActivityLevelEnum.SEDENTARY]: 1.2,
  [UserActivityLevelEnum.LIGHTLY_ACTIVE]: 1.375,
  [UserActivityLevelEnum.MODERATELY_ACTIVE]: 1.55,
  [UserActivityLevelEnum.VERY_ACTIVE]: 1.725,
  [UserActivityLevelEnum.SUPER_ACTIVE]: 1.9,
};

export const ChatRoleEnum = {
  USER: "user",
  ASSISTANT: "assistant",
} as const;

export type ChatRole = (typeof ChatRoleEnum)[keyof typeof ChatRoleEnum];
export const AvailableChatRoles = Object.values(ChatRoleEnum);

