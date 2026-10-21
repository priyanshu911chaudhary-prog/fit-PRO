import { AddedFoodItem, FoodItem, MacroBreakdown } from "../types";
import {
  aggregateMacroDistribution,
  calculateItemNutrients,
} from "@/lib/nutrition-engine";

export function formatSafeDate(val?: string | Date): string {
  if (!val) return "Today";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "Today";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

export function calculateMealMacros(items: AddedFoodItem[]): MacroBreakdown {
  if (!items || items.length === 0) {
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      proteinCals: 0,
      carbsCals: 0,
      fatCals: 0,
      proteinPct: 0,
      carbsPct: 0,
      fatPct: 0,
    };
  }

  const computedItems = items.map((item) => {
    // If item has base nutrition and servingBasis, use calculation engine
    if (item.baseCalories !== undefined && item.servingBasis) {
      return calculateItemNutrients(
        {
          name: item.name,
          calories: item.baseCalories ?? item.calories,
          protein: item.baseProtein ?? item.protein,
          carbs: item.baseCarbs ?? item.carbs,
          fat: item.baseFat ?? item.fat,
          servingBasis: item.servingBasis,
          servingUnit: item.servingUnit,
          pieceWeightG: item.pieceWeightG,
          servingWeightG: item.servingWeightG,
        },
        item.quantity,
        item.unit
      );
    }

    // Fallback for legacy items without base properties
    return {
      calories: item.calories * item.quantity,
      protein: item.protein * item.quantity,
      carbs: item.carbs * item.quantity,
      fat: item.fat * item.quantity,
      factor: item.quantity,
    };
  });

  return aggregateMacroDistribution(computedItems);
}

export function filterFoodCatalog(
  catalog: FoodItem[],
  searchQuery: string,
  categoryFilter: string
): FoodItem[] {
  const query = searchQuery.trim().toLowerCase();
  return catalog.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(query) ||
      (item.aliases && item.aliases.some((a) => a.toLowerCase().includes(query)));

    if (!matchesSearch) return false;
    if (categoryFilter === "all" || !categoryFilter) return true;
    if (categoryFilter === "high_protein") return item.protein >= 20;
    if (categoryFilter === "low_carb") return item.carbs <= 10;
    if (categoryFilter === "snack") return item.calories <= 250;
    return item.category === categoryFilter;
  });
}
