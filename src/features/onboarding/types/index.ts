export interface OnboardingFormData {
  gender: string;
  dob: string;
  height: number;
  weight: number;
  fitnessGoal: string;
  activityLevel: string;
  dietaryPreference: string;
  experienceLevel: string;
  equipmentAvailable: string[];
}

export interface StepConfig {
  number: number;
  title: string;
  short: string;
}
