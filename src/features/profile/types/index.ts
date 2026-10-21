export interface ProfileData {
  _id?: string;
  gender: string;
  dob: string | Date;
  age: number;
  height: number;
  weight: number;
  fitnessGoal: string;
  activityLevel: string;
  dietaryPreference: string;
  experienceLevel: string;
  equipmentAvailable: string[];
  isProfileComplete?: boolean;
}

export interface ProfileMetrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  age: number;
}
