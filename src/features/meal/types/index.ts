export interface FoodItem {
  _id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  mealType?: string;
  dietaryPreference?: string;
}

export interface AddedFoodItem {
  foodItemId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
}

export interface MealLogItemRecord {
  foodItemId?:
    | {
        _id?: string;
        name?: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      }
    | string;
  foodItem?:
    | {
        _id?: string;
        name?: string;
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
      }
    | string;
  servingSize?: string;
  calories?: number;
  quantity?: number;
}

export interface MealLogRecord {
  _id: string;
  title?: string;
  mealType?: string;
  totalCalories: number;
  date?: string;
  createdAt?: string;
  meals?: MealLogItemRecord[];
  items?: MealLogItemRecord[];
}

export type CategoryFilterId = "all" | "high_protein" | "low_carb" | "snack";

export interface MacroBreakdown {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  proteinCals: number;
  carbsCals: number;
  fatCals: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}
