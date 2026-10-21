export interface FoodItem {
  _id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingBasis?: "per_100g" | "per_100ml" | "per_piece" | "per_slice" | "per_serving";
  servingUnit?: string;
  defaultQuantity?: number;
  pieceWeightG?: number;
  servingWeightG?: number;
  category?: string;
  aliases?: string[];
  state?: "raw" | "cooked" | "prepared" | "packaged";
  source?: string;
  mealType?: string;
  dietaryPreference?: string;
}

export interface AddedFoodItem {
  foodItemId: string;
  name: string;
  baseCalories?: number;
  baseProtein?: number;
  baseCarbs?: number;
  baseFat?: number;
  servingBasis?: string;
  servingUnit?: string;
  pieceWeightG?: number;
  servingWeightG?: number;
  quantity: number;
  unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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
        servingBasis?: string;
        servingUnit?: string;
        pieceWeightG?: number;
        servingWeightG?: number;
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
        servingBasis?: string;
        servingUnit?: string;
        pieceWeightG?: number;
        servingWeightG?: number;
      }
    | string;
  name?: string;
  quantity?: number;
  unit?: string;
  servingSize?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface MealLogRecord {
  _id: string;
  title?: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  consumedDate: string; // YYYY-MM-DD
  totalCalories: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  date?: string;
  createdAt?: string;
  meals?: MealLogItemRecord[];
  items?: MealLogItemRecord[];
}

export type CategoryFilterId =
  | "all"
  | "vegetables"
  | "fruits"
  | "protein"
  | "grains"
  | "dairy"
  | "fats_oils"
  | "prepared";

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

export interface DailyNutritionTarget {
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}
