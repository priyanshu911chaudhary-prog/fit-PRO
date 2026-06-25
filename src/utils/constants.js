export const UserGenderEnum = {
    MALE:"male",
    FEMALE:"female",
    OTHER:"other"
}

export const UserGoalEnum = {
    WEIGHT_LOSS:"weight_loss",
    WEIGHT_GAIN:"weight_gain",
    MUSCLE_BUILDING:"muscle_building",
    MAINTAIN_WEIGHT:"maintain_weight",
    ENDURANCE_TRAINING:"endurance_training",
    STRENGTH_TRAINING:"strength_training",
    FLEXIBILITY_TRAINING:"flexibility_training",
    GENERAL_FITNESS:"general_fitness"
}

export const UserActivityLevelEnum = {
    SEDENTARY:"sedentary",
    LIGHTLY_ACTIVE:"lightly_active",
    MODERATELY_ACTIVE:"moderately_active",
    VERY_ACTIVE:"very_active",
    SUPER_ACTIVE:"super_active"
}

export const UserDietaryPreferenceEnum = {
    VEGETARIAN:"vegetarian",
    VEGAN:"vegan",
    PESCATARIAN:"pescatarian",
    KETOGENIC:"ketogenic",
    PALEO:"paleo",
    MEDITERRANEAN:"mediterranean",
    LOW_CARB:"low_carb",
    LOW_FAT:"low_fat",
    NONE:"none"
}

export const UserWeightPreferenceEnum = {
    UNDERWEIGHT: "underweight",
    NORMAL: "normal",
    OVERWEIGHT: "overweight",
    OBESE: "obese"
}

export const ExerciseCategoryEnum = {
    STRENGTH: "strength",
    CARDIO: "cardio",
    FLEXIBILITY: "flexibility"
};

export const MuscleGroupEnum = {
    CHEST: "chest",
    BACK: "back",
    LEGS: "legs",
    SHOULDERS: "shoulders",
    ARMS: "arms",
    CORE: "core",
    FULL_BODY: "full_body"
};

export const EquipmentEnum = {
    BODYWEIGHT: "bodyweight",
    DUMBBELL: "dumbbell",
    BARBELL: "barbell",
    MACHINE: "machine",
    CABLE: "cable",
    OTHER: "other"
};

export const AvailableUserGenders = Object.values(UserGenderEnum);
export const AvailableUserGoals = Object.values(UserGoalEnum);
export const AvailableUserActivityLevels = Object.values(UserActivityLevelEnum);
export const AvailableUserDietaryPreferences = Object.values(UserDietaryPreferenceEnum);
export const AvailableUserWeightPreferences = Object.values(UserWeightPreferenceEnum);
export const AvailableExerciseCategories = Object.values(ExerciseCategoryEnum);
export const AvailableMuscleGroups = Object.values(MuscleGroupEnum);
export const AvailableEquipment = Object.values(EquipmentEnum);

export const MealTypeEnum = {
    BREAKFAST: "breakfast",
    LUNCH: "lunch",
    DINNER: "dinner",
    SNACK: "snack"
};

export const AvailableMealTypes = Object.values(MealTypeEnum);