export interface DashboardStats {
  streak: number;
  waterToday: {
    totalMl: number;
    targetMl: number;
    percentage: number;
  };
  metrics: {
    bmi: number;
    category: string;
    bmr: number;
    tdee: number;
    weight: number;
    height: number;
  };
  weightHistory: Array<{
    date: string;
    weight: number;
    bmi: number;
  }>;
  recentWorkouts: Array<{
    _id: string;
    date: string;
    workoutType: string;
    duration: number;
    exercisesCount: number;
  }>;
  recentMeals: Array<{
    _id: string;
    date: string;
    mealType: string;
    totalCalories: number;
  }>;
}

export type TimeRange = "7d" | "30d" | "all";
export type ChartMetric = "weight" | "bmi";

export interface MetricDelta {
  diff: number;
  isPositive: boolean;
  isZero: boolean;
  unit: string;
}
