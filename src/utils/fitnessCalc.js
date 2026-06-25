import { 
    UserActivityLevelEnum, 
    UserGenderEnum, 
    UserWeightPreferenceEnum 
} from './constants.js';

/**
 * Activity level multipliers mapped to the Enum
 */
const ACTIVITY_MULTIPLIERS = {
    [UserActivityLevelEnum.SEDENTARY]: 1.2,
    [UserActivityLevelEnum.LIGHTLY_ACTIVE]: 1.375,
    [UserActivityLevelEnum.MODERATELY_ACTIVE]: 1.55,
    [UserActivityLevelEnum.VERY_ACTIVE]: 1.725,
    [UserActivityLevelEnum.SUPER_ACTIVE]: 1.9,
};

/**
 * Calculate Body Mass Index (BMI)
 */
export const calculateBMI = (weight, height) => {
    const heightInMeters = height / 100;
    const bmi = +(weight / (heightInMeters * heightInMeters)).toFixed(1);

    let category = "";
    if (bmi < 18.5) category = UserWeightPreferenceEnum.UNDERWEIGHT;
    else if (bmi >= 18.5 && bmi <= 24.9) category = UserWeightPreferenceEnum.NORMAL;
    else if (bmi >= 25 && bmi <= 29.9) category = UserWeightPreferenceEnum.OVERWEIGHT;
    else category = UserWeightPreferenceEnum.OBESE;

    return { bmi, category };
};

/**
 * Calculate Basal Metabolic Rate (BMR)
 */
export const calculateBMR = (weight, height, age, gender) => {
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);

    // Using the Enum for comparison
    if (gender.toLowerCase() === UserGenderEnum.MALE) {
        bmr += 5;
    } else {
        bmr -= 161;
    }

    return Math.round(bmr);
};

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 */
export const calculateTDEE = (bmr, activityLevel) => {
    // Fallback to sedentary if the provided activity level isn't in our multiplier map
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel.toLowerCase()] || ACTIVITY_MULTIPLIERS.sedentary;
    return Math.round(bmr * multiplier);
};

/**
 * Master function to get all metrics
 */
export const getFitnessMetrics = (profile) => {
    const { weight, height, age, gender, activityLevel } = profile;

    const { bmi, category: bmiCategory } = calculateBMI(weight, height);
    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activityLevel);

    return {
        bmi,
        bmiCategory,
        bmr,
        tdee
    };
};