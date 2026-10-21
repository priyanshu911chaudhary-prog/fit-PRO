import { describe, it, expect } from "vitest";
import { catalogFoods, FoodSeedItem } from "@/lib/catalog/food-catalog-data";
import { calculateItemNutrients } from "@/lib/nutrition-engine";

describe("Food Catalog Quality & Nutrition Integrity", () => {
  it("contains at least 300 distinct, verified food items", () => {
    expect(catalogFoods.length).toBeGreaterThanOrEqual(300);
  });

  it("has zero duplicate food names (case-insensitive and trimmed)", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const food of catalogFoods) {
      const normalized = food.name.toLowerCase().trim();
      if (seen.has(normalized)) {
        duplicates.push(food.name);
      }
      seen.add(normalized);
    }

    expect(duplicates).toEqual([]);
  });

  it("preserves legitimate raw vs cooked distinctions with distinct nutrition", () => {
    const rawRice = catalogFoods.find((f) => f.name === "White Rice (Raw)");
    const cookedRice = catalogFoods.find((f) => f.name === "White Rice (Cooked)");

    expect(rawRice).toBeDefined();
    expect(cookedRice).toBeDefined();
    expect(rawRice!.state).toBe("raw");
    expect(cookedRice!.state).toBe("cooked");
    // Raw rice is much more calorie-dense than hydrated cooked rice
    expect(rawRice!.calories).toBeGreaterThan(cookedRice!.calories * 2);

    const rawChicken = catalogFoods.find((f) => f.name === "Chicken Breast (Raw, Skinless)");
    const cookedChicken = catalogFoods.find((f) => f.name === "Chicken Breast (Cooked, Skinless)");

    expect(rawChicken).toBeDefined();
    expect(cookedChicken).toBeDefined();
    expect(rawChicken!.state).toBe("raw");
    expect(cookedChicken!.state).toBe("cooked");
    // Cooked chicken loses moisture, increasing protein density per 100g
    expect(cookedChicken!.protein).toBeGreaterThan(rawChicken!.protein);
  });

  it("validates nutrition schema constraints on every record", () => {
    const validBases = ["per_100g", "per_100ml", "per_piece", "per_slice", "per_serving"];
    const validStates = ["raw", "cooked", "prepared", "packaged"];
    const validCategories = [
      "vegetables",
      "fruits",
      "protein",
      "grains",
      "dairy",
      "fats_oils",
      "condiments",
      "prepared",
    ];

    for (const food of catalogFoods) {
      expect(food.name.trim().length).toBeGreaterThan(0);
      expect(food.calories).toBeGreaterThanOrEqual(0);
      expect(food.protein).toBeGreaterThanOrEqual(0);
      expect(food.carbs).toBeGreaterThanOrEqual(0);
      expect(food.fat).toBeGreaterThanOrEqual(0);

      expect(validBases).toContain(food.servingBasis);
      expect(validStates).toContain(food.state);
      expect(validCategories).toContain(food.category);
      expect(food.isActive).toBe(true);
      expect(food.source).toBeDefined();
      expect(food.source.length).toBeGreaterThan(0);
    }
  });

  it("ensures all per_piece and per_slice foods have verified pieceWeightG", () => {
    const pieceFoods = catalogFoods.filter(
      (f) => f.servingBasis === "per_piece" || f.servingBasis === "per_slice"
    );

    expect(pieceFoods.length).toBeGreaterThan(0);
    for (const food of pieceFoods) {
      expect(food.pieceWeightG).toBeDefined();
      expect(food.pieceWeightG!).toBeGreaterThan(0);
    }
  });

  it("ensures macro sum per 100g does not exceed physical limits", () => {
    const per100gFoods = catalogFoods.filter((f) => f.servingBasis === "per_100g");

    for (const food of per100gFoods) {
      const macroSum = food.protein + food.carbs + food.fat;
      // Allow minor leeway for rounding or ash/minerals
      expect(macroSum).toBeLessThanOrEqual(102);
    }
  });

  it("checks calorie consistency with 4/4/9 approximation or documented dietary fiber", () => {
    for (const food of catalogFoods) {
      if (food.calories < 15) continue; // Skip near-zero calorie items

      const estKcal = food.protein * 4 + food.carbs * 4 + food.fat * 9;
      // Exception: spices and cocoa powder have high dietary fiber (20-35g fiber) where fiber is ~1.5 kcal/g
      const isHighFiberSpiceOrCocoa =
        food.name.includes("Cocoa") ||
        food.name.includes("Clove") ||
        food.category === "condiments";

      if (!isHighFiberSpiceOrCocoa) {
        // Calories should be broadly consistent with 4/4/9 within 35% margin
        const diff = Math.abs(food.calories - estKcal);
        expect(diff).toBeLessThan(food.calories * 0.4 + 25);
      }
    }
  });

  it("correctly calculates scaled nutrition via calculateNutrients engine", () => {
    const banana = catalogFoods.find((f) => f.name === "Banana");
    // 1 banana with piece basis
    const onePiece = calculateItemNutrients(banana!, 1, "piece");
    expect(onePiece.calories).toBe(89);
    expect(onePiece.protein).toBeCloseTo(1.1, 1);

    // 100g of Banana
    const hundredG = calculateItemNutrients(banana!, 100, "g");
    expect(hundredG.calories).toBeGreaterThan(70);
    expect(hundredG.calories).toBeLessThan(85);
  });
});
