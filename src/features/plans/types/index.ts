export interface GenericPlanExercise {
  name: string;
  sets?: number;
  reps?: string | number;
  notes?: string;
}

export interface GenericPlanMealItem {
  name: string;
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface GenericPlanMeal {
  name?: string;
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  mealType?: string;
  items?: GenericPlanMealItem[];
}

export interface GenericPlanDay {
  dayNumber?: number;
  dayName?: string;
  day?: string;
  focus?: string;
  exercises?: GenericPlanExercise[];
  meals?: GenericPlanMeal[];
}

export interface GenericPlanRecord {
  _id?: string;
  planName?: string;
  isActive?: boolean;
  schedule?: GenericPlanDay[];
  days?: GenericPlanDay[];
  createdAt?: string;
}

export type PlanType = "workout" | "meal";
