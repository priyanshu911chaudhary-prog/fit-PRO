import { AddedFoodItem, FoodItem, MacroBreakdown } from "../types";

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
  const totalCalories = items.reduce(
    (acc, item) => acc + Math.round(item.calories * item.quantity),
    0
  );
  const totalProtein = items.reduce(
    (acc, item) => acc + Math.round(item.protein * item.quantity),
    0
  );
  const totalCarbs = items.reduce(
    (acc, item) => acc + Math.round(item.carbs * item.quantity),
    0
  );
  const totalFat = items.reduce(
    (acc, item) => acc + Math.round(item.fat * item.quantity),
    0
  );

  const proteinCals = totalProtein * 4;
  const carbsCals = totalCarbs * 4;
  const fatCals = totalFat * 9;
  const macroCalSum = proteinCals + carbsCals + fatCals || 1;

  const proteinPct = Math.round((proteinCals / macroCalSum) * 100);
  const carbsPct = Math.round((carbsCals / macroCalSum) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    proteinCals,
    carbsCals,
    fatCals,
    proteinPct,
    carbsPct,
    fatPct,
  };
}

export function filterFoodCatalog(
  catalog: FoodItem[],
  searchQuery: string,
  categoryFilter: string
): FoodItem[] {
  const query = searchQuery.trim().toLowerCase();
  return catalog.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(query);
    if (categoryFilter === "high_protein") return matchesSearch && item.protein >= 20;
    if (categoryFilter === "low_carb") return matchesSearch && item.carbs <= 10;
    if (categoryFilter === "snack") return matchesSearch && item.calories <= 250;
    return matchesSearch;
  });
}
