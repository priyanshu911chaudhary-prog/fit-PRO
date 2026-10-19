import {
  ActivityMultipliers,
  UserActivityLevel,
  UserGender,
  UserGenderEnum,
  UserWeightPreference,
  UserWeightPreferenceEnum,
} from "../constants";

export interface FitnessProfileInput {
  weight: number; // in kg
  height: number; // in cm
  dob?: Date | string;
  age?: number;
  gender: UserGender | string;
  activityLevel: UserActivityLevel | string;
}

export interface BMICalculationResult {
  bmi: number;
  category: UserWeightPreference;
}

export interface FitnessMetricsResult {
  bmi: number;
  bmiCategory: UserWeightPreference;
  bmr: number;
  tdee: number;
  age: number;
}

/**
 * Calculate age dynamically from Date of Birth
 */
export function calculateAge(dob: Date | string): number {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) {
    return 25; // fallback safe age
  }
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(1, age);
}

/**
 * Calculate Body Mass Index (BMI) with boundary coverage:
 * < 18.5: underweight
 * < 25.0: normal
 * < 30.0: overweight
 * >= 30.0: obese
 */
export function calculateBMI(weight: number, height: number): BMICalculationResult {
  if (height <= 0 || weight <= 0) {
    throw new Error("Height and weight must be greater than zero");
  }
  const heightInMeters = height / 100;
  const bmi = +(weight / (heightInMeters * heightInMeters)).toFixed(1);

  let category: UserWeightPreference;
  if (bmi < 18.5) {
    category = UserWeightPreferenceEnum.UNDERWEIGHT;
  } else if (bmi < 25.0) {
    category = UserWeightPreferenceEnum.NORMAL;
  } else if (bmi < 30.0) {
    category = UserWeightPreferenceEnum.OVERWEIGHT;
  } else {
    category = UserWeightPreferenceEnum.OBESE;
  }

  return { bmi, category };
}

/**
 * Calculate Basal Metabolic Rate (BMR) using the Mifflin-St Jeor formula
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: string
): number {
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (gender.toLowerCase() === UserGenderEnum.MALE) {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  return Math.round(bmr);
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE) based on BMR and activity level
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  const key = activityLevel.toLowerCase() as UserActivityLevel;
  const multiplier = ActivityMultipliers[key] || ActivityMultipliers.sedentary;
  return Math.round(bmr * multiplier);
}

/**
 * Calculate comprehensive fitness metrics for a user profile
 */
export function getFitnessMetrics(profile: FitnessProfileInput): FitnessMetricsResult {
  const effectiveAge = profile.dob ? calculateAge(profile.dob) : profile.age || 25;
  const { bmi, category: bmiCategory } = calculateBMI(profile.weight, profile.height);
  const bmr = calculateBMR(profile.weight, profile.height, effectiveAge, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    age: effectiveAge,
  };
}
