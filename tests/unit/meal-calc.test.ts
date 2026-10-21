import { describe, it, expect } from "vitest";
import {
  calculateMealMacros,
  filterFoodCatalog,
  formatSafeDate,
} from "@/features/meal/lib/calculations";
import { AddedFoodItem, FoodItem } from "@/features/meal/types";

describe("Meal calculations & helpers", () => {
  it("calculates accurate caloric energy and macro ratios for added foods", () => {
    const items: AddedFoodItem[] = [
      {
        foodItemId: "food-1",
        name: "Chicken Breast",
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        quantity: 2,
      },
      {
        foodItemId: "food-2",
        name: "Brown Rice",
        calories: 215,
        protein: 5,
        carbs: 45,
        fat: 1.8,
        quantity: 1,
      },
    ];

    const macros = calculateMealMacros(items);

    expect(macros.totalCalories).toBe(165 * 2 + 215 * 1); // 330 + 215 = 545
    expect(macros.totalProtein).toBe(Math.round(31 * 2) + Math.round(5 * 1)); // 62 + 5 = 67
    expect(macros.totalCarbs).toBe(0 + 45); // 45
    expect(macros.totalFat).toBe(Math.round(3.6 * 2) + Math.round(1.8 * 1)); // 7 + 2 = 9
    expect(macros.proteinPct + macros.carbsPct + macros.fatPct).toBe(100);
  });

  it("handles zero items without dividing by zero", () => {
    const macros = calculateMealMacros([]);
    expect(macros.totalCalories).toBe(0);
    expect(macros.totalProtein).toBe(0);
    expect(macros.totalCarbs).toBe(0);
    expect(macros.totalFat).toBe(0);
    expect(macros.proteinPct).toBe(0);
    expect(macros.carbsPct).toBe(0);
    expect(macros.fatPct).toBe(100);
  });

  it("filters food catalog accurately by search query and category", () => {
    const catalog: FoodItem[] = [
      { _id: "1", name: "Whey Protein", calories: 120, protein: 24, carbs: 3, fat: 1 },
      { _id: "2", name: "Almonds", calories: 160, protein: 6, carbs: 6, fat: 14 },
      { _id: "3", name: "Banana", calories: 105, protein: 1, carbs: 27, fat: 0 },
    ];

    expect(filterFoodCatalog(catalog, "whey", "all")).toHaveLength(1);
    expect(filterFoodCatalog(catalog, "", "high_protein")).toHaveLength(1);
    expect(filterFoodCatalog(catalog, "", "high_protein")[0].name).toBe("Whey Protein");
    expect(filterFoodCatalog(catalog, "", "low_carb")).toHaveLength(2);
    expect(filterFoodCatalog(catalog, "", "snack")).toHaveLength(3);
  });

  it("safely formats dates for logs", () => {
    expect(formatSafeDate(undefined)).toBe("Today");
    expect(formatSafeDate("invalid-date")).toBe("Today");

    const pastDate = new Date("2024-01-15T10:30:00Z");
    const formatted = formatSafeDate(pastDate);
    expect(formatted).toContain("2024");
  });
});
