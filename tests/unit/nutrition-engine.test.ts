import { describe, it, expect } from "vitest";
import {
  getServingMultiplier,
  calculateItemNutrients,
  aggregateMacroDistribution,
  shiftCalendarDay,
  normalizeDateOnly,
  CatalogNutritionBasis,
} from "@/lib/nutrition-engine";

describe("Nutrition Calculation Engine", () => {
  describe("getServingMultiplier & calculateItemNutrients", () => {
    it("correctly calculates per-100g basis for grams and kilograms", () => {
      const tomato: CatalogNutritionBasis = {
        name: "Tomato",
        calories: 18,
        protein: 0.9,
        carbs: 3.9,
        fat: 0.2,
        servingBasis: "per_100g",
        servingUnit: "g",
      };

      // 150g tomato
      const yield150g = calculateItemNutrients(tomato, 150, "g");
      expect(yield150g.factor).toBe(1.5);
      expect(yield150g.calories).toBeCloseTo(27, 1);
      expect(yield150g.protein).toBeCloseTo(1.35, 2);
      expect(yield150g.carbs).toBeCloseTo(5.85, 2);
      expect(yield150g.fat).toBeCloseTo(0.3, 2);

      // 0.5kg tomato = 500g
      const yield05kg = calculateItemNutrients(tomato, 0.5, "kg");
      expect(yield05kg.factor).toBe(5);
      expect(yield05kg.calories).toBeCloseTo(90, 1);
    });

    it("correctly handles per-100g foods with configured servingWeightG (e.g. Peanut Butter)", () => {
      // Peanut butter: 588 kcal / 100g, 1 serving = 32g
      const peanutButter: CatalogNutritionBasis = {
        name: "Peanut Butter",
        calories: 588,
        protein: 25.0,
        carbs: 20.0,
        fat: 50.0,
        servingBasis: "per_100g",
        servingUnit: "g",
        servingWeightG: 32,
      };

      // 1 serving = 32g = 0.32x basis
      const yield1Serving = calculateItemNutrients(peanutButter, 1, "serving");
      expect(yield1Serving.factor).toBe(0.32);
      expect(yield1Serving.calories).toBeCloseTo(188.16, 1);
      expect(yield1Serving.protein).toBeCloseTo(8.0, 1);
      expect(yield1Serving.carbs).toBeCloseTo(6.4, 1);
      expect(yield1Serving.fat).toBeCloseTo(16.0, 1);

      // 2.5 servings = 80g = 0.8x basis
      const yield2p5Servings = calculateItemNutrients(peanutButter, 2.5, "serving");
      expect(yield2p5Servings.factor).toBeCloseTo(0.8, 2);
      expect(yield2p5Servings.calories).toBeCloseTo(470.4, 1);
    });

    it("correctly handles per-piece items with defined piece weight", () => {
      const wholeEgg: CatalogNutritionBasis = {
        name: "Whole Egg",
        calories: 143,
        protein: 12.6,
        carbs: 0.7,
        fat: 9.5,
        servingBasis: "per_100g",
        servingUnit: "piece",
        pieceWeightG: 50, // standard medium egg is 50g
      };

      // 2 pieces = 100g = 1x basis
      const yield2Eggs = calculateItemNutrients(wholeEgg, 2, "piece");
      expect(yield2Eggs.factor).toBe(1);
      expect(yield2Eggs.calories).toBeCloseTo(143, 1);
      expect(yield2Eggs.protein).toBeCloseTo(12.6, 1);

      // 3 pieces = 150g = 1.5x basis
      const yield3Eggs = calculateItemNutrients(wholeEgg, 3, "piece");
      expect(yield3Eggs.factor).toBe(1.5);
      expect(yield3Eggs.protein).toBeCloseTo(18.9, 1);
    });

    it("correctly calculates per-100ml basis with ml, l, cup, tbsp, and tsp conversions", () => {
      const milk: CatalogNutritionBasis = {
        name: "Cow Milk",
        calories: 62,
        protein: 3.2,
        carbs: 4.8,
        fat: 3.4,
        servingBasis: "per_100ml",
        servingUnit: "ml",
      };

      // 250ml milk = 2.5x
      const yield250ml = calculateItemNutrients(milk, 250, "ml");
      expect(yield250ml.factor).toBe(2.5);
      expect(yield250ml.calories).toBeCloseTo(155, 1);
      expect(yield250ml.protein).toBeCloseTo(8.0, 1);

      // 1 liter = 1000ml = 10x
      const yield1L = calculateItemNutrients(milk, 1, "l");
      expect(yield1L.factor).toBe(10);
      expect(yield1L.calories).toBeCloseTo(620, 1);

      // 1 cup milk = 240ml = 2.4x
      const yield1Cup = calculateItemNutrients(milk, 1, "cup");
      expect(yield1Cup.factor).toBe(2.4);
      expect(yield1Cup.calories).toBeCloseTo(148.8, 1);

      // 1 tbsp = 15ml = 0.15x
      const yield1Tbsp = calculateItemNutrients(milk, 1, "tbsp");
      expect(yield1Tbsp.factor).toBe(0.15);
      expect(yield1Tbsp.calories).toBeCloseTo(9.3, 1);

      // 1 tsp = 5ml = 0.05x
      const yield1Tsp = calculateItemNutrients(milk, 1, "tsp");
      expect(yield1Tsp.factor).toBe(0.05);
      expect(yield1Tsp.calories).toBeCloseTo(3.1, 1);
    });

    it("handles legacy per_serving items with custom serving unit", () => {
      const proteinPowder: CatalogNutritionBasis = {
        name: "Whey Protein",
        calories: 120,
        protein: 24,
        carbs: 3,
        fat: 1.5,
        servingBasis: "per_serving",
        servingUnit: "scoop",
        servingWeightG: 30,
      };

      // 1 scoop = 1 serving = 120 kcal
      const yield1Scoop = calculateItemNutrients(proteinPowder, 1, "scoop");
      expect(yield1Scoop.factor).toBe(1);
      expect(yield1Scoop.calories).toBe(120);
      expect(yield1Scoop.protein).toBe(24);

      // 2 servings = 240 kcal
      const yield2Servings = calculateItemNutrients(proteinPowder, 2, "serving");
      expect(yield2Servings.factor).toBe(2);
      expect(yield2Servings.calories).toBe(240);

      // 60g = 2 scoops (since 30g per scoop)
      const yield60g = calculateItemNutrients(proteinPowder, 60, "g");
      expect(yield60g.factor).toBe(2);
      expect(yield60g.calories).toBe(240);

      // Fractional quantity: 0.5 scoop = 60 kcal
      const yieldHalf = calculateItemNutrients(proteinPowder, 0.5, "scoop");
      expect(yieldHalf.factor).toBe(0.5);
      expect(yieldHalf.calories).toBe(60);
    });

    it("correctly calculates per-slice items and avoids double conversion", () => {
      // 1 slice of whole wheat bread = 75 kcal, 3g protein, 14g carbs, 1g fat (30g per slice)
      const breadSlice: CatalogNutritionBasis = {
        name: "Whole Wheat Bread",
        calories: 75,
        protein: 3.0,
        carbs: 14.0,
        fat: 1.0,
        servingBasis: "per_slice",
        servingUnit: "slice",
        pieceWeightG: 30,
      };

      // 2 slices: factor should be exactly 2
      const yield2Slices = calculateItemNutrients(breadSlice, 2, "slice");
      expect(yield2Slices.factor).toBe(2);
      expect(yield2Slices.calories).toBe(150);
      expect(yield2Slices.protein).toBe(6.0);
      expect(yield2Slices.carbs).toBe(28.0);
      expect(yield2Slices.fat).toBe(2.0);

      // Fractional: 0.5 slice = 37.5 kcal
      const yieldHalfSlice = calculateItemNutrients(breadSlice, 0.5, "slice");
      expect(yieldHalfSlice.factor).toBe(0.5);
      expect(yieldHalfSlice.calories).toBe(37.5);
      expect(yieldHalfSlice.protein).toBe(1.5);

      // Converted by grams: 60g bread = 60 / 30 = 2 slices
      const yield60g = calculateItemNutrients(breadSlice, 60, "g");
      expect(yield60g.factor).toBe(2);
      expect(yield60g.calories).toBe(150);
    });

    it("correctly calculates per-piece items and supports weight conversion", () => {
      const apple: CatalogNutritionBasis = {
        name: "Apple",
        calories: 95,
        protein: 0.5,
        carbs: 25.0,
        fat: 0.3,
        servingBasis: "per_piece",
        servingUnit: "piece",
        pieceWeightG: 182,
      };

      // 1 piece = 95 kcal
      const yield1Piece = calculateItemNutrients(apple, 1, "piece");
      expect(yield1Piece.factor).toBe(1);
      expect(yield1Piece.calories).toBe(95);

      // 3 pieces = 285 kcal
      const yield3Pieces = calculateItemNutrients(apple, 3, "piece");
      expect(yield3Pieces.factor).toBe(3);
      expect(yield3Pieces.calories).toBe(285);

      // 91g (half an apple by weight) = 91 / 182 = 0.5 factor
      const yield91g = calculateItemNutrients(apple, 91, "g");
      expect(yield91g.factor).toBeCloseTo(0.5, 2);
      expect(yield91g.calories).toBeCloseTo(47.5, 1);
    });

    it("safely handles missing or undefined nutrient fields without producing NaN", () => {
      const incompleteFood: CatalogNutritionBasis = {
        name: "Incomplete Item",
        calories: 100,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingBasis: "per_100g",
        servingUnit: "g",
      };

      // Force undefined fields
      delete (incompleteFood as unknown as Record<string, unknown>).protein;
      delete (incompleteFood as unknown as Record<string, unknown>).fat;

      const yieldItem = calculateItemNutrients(incompleteFood, 100, "g");
      expect(yieldItem.calories).toBe(100);
      expect(yieldItem.protein).toBe(0);
      expect(yieldItem.fat).toBe(0);
      expect(isNaN(yieldItem.protein)).toBe(false);
      expect(isNaN(yieldItem.fat)).toBe(false);
    });
  });

  describe("Strict Unit Conversion & Input Validation Rejection", () => {
    it("rejects zero, negative, NaN, and infinite quantities", () => {
      const food: CatalogNutritionBasis = {
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        servingBasis: "per_100g",
      };

      expect(() => getServingMultiplier(0, "g", food)).toThrow("Quantity must be a positive number");
      expect(() => getServingMultiplier(-5, "g", food)).toThrow("Quantity must be a positive number");
      expect(() => getServingMultiplier(NaN, "g", food)).toThrow("Quantity must be a positive number");
      expect(() => getServingMultiplier(Infinity, "g", food)).toThrow("Quantity must be a positive number");
    });

    it("strictly rejects unsupported or unknown units", () => {
      const food: CatalogNutritionBasis = {
        name: "Test Food",
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 5,
        servingBasis: "per_100g",
        servingUnit: "g",
      };

      expect(() => calculateItemNutrients(food, 50, "some_random_unit")).toThrow(/Unsupported unit/);
      expect(() => calculateItemNutrients(food, 1, "box")).toThrow(/Unsupported unit/);
      expect(() => calculateItemNutrients(food, 1, "liters")).toThrow(/Unsupported unit/);
    });

    it("strictly prevents mass-to-volume and volume-to-mass conversions without density", () => {
      const solidFood: CatalogNutritionBasis = {
        name: "Chicken Breast",
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingBasis: "per_100g",
        servingUnit: "g",
      };

      // Volume unit on mass-based food must be rejected
      expect(() => calculateItemNutrients(solidFood, 250, "ml")).toThrow(
        /Cannot convert volume unit 'ml' to mass-based food/
      );
      expect(() => calculateItemNutrients(solidFood, 1, "l")).toThrow(
        /Cannot convert volume unit 'l' to mass-based food/
      );

      const liquidFood: CatalogNutritionBasis = {
        name: "Olive Oil",
        calories: 884,
        protein: 0,
        carbs: 0,
        fat: 100,
        servingBasis: "per_100ml",
        servingUnit: "ml",
      };

      // Mass unit on volume-based food must be rejected
      expect(() => calculateItemNutrients(liquidFood, 100, "g")).toThrow(
        /Cannot convert mass unit 'g' to volume-based food/
      );
      expect(() => calculateItemNutrients(liquidFood, 1, "kg")).toThrow(
        /Cannot convert mass unit 'kg' to volume-based food/
      );
    });

    it("strictly rejects unit conversions when required serving or piece weights are absent", () => {
      // Food defined per_100g without pieceWeightG
      const tomatoWithoutPieceWeight: CatalogNutritionBasis = {
        name: "Tomato",
        calories: 18,
        protein: 0.9,
        carbs: 3.9,
        fat: 0.2,
        servingBasis: "per_100g",
        servingUnit: "g",
      };

      expect(() => calculateItemNutrients(tomatoWithoutPieceWeight, 2, "piece")).toThrow(
        /piece weight is not configured/
      );
      expect(() => calculateItemNutrients(tomatoWithoutPieceWeight, 1, "serving")).toThrow(
        /serving weight is not configured/
      );

      // Food defined per_piece without pieceWeightG
      const genericPieceFood: CatalogNutritionBasis = {
        name: "Generic Fruit",
        calories: 80,
        protein: 1,
        carbs: 20,
        fat: 0,
        servingBasis: "per_piece",
        servingUnit: "piece",
      };

      // Piece count is fine
      expect(calculateItemNutrients(genericPieceFood, 2, "piece").factor).toBe(2);

      // Converting from grams without configured pieceWeightG must be rejected
      expect(() => calculateItemNutrients(genericPieceFood, 150, "g")).toThrow(
        /piece weight is not configured/
      );
    });
  });

  describe("aggregateMacroDistribution", () => {
    it("handles zero items without dividing by zero and returns 0% for all macros", () => {
      const result = aggregateMacroDistribution([]);
      expect(result.totalCalories).toBe(0);
      expect(result.totalProtein).toBe(0);
      expect(result.totalCarbs).toBe(0);
      expect(result.totalFat).toBe(0);
      expect(result.proteinPct).toBe(0);
      expect(result.carbsPct).toBe(0);
      expect(result.fatPct).toBe(0);
    });

    it("sums multiple items unrounded and computes precise macro percentages", () => {
      const items = [
        { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        { calories: 215, protein: 5, carbs: 45, fat: 1.8 },
      ];

      const result = aggregateMacroDistribution(items);

      expect(result.totalCalories).toBe(380);
      expect(result.totalProtein).toBe(36);
      expect(result.totalCarbs).toBe(45);
      expect(result.totalFat).toBe(5.4);

      expect(result.proteinPct + result.carbsPct + result.fatPct).toBe(100);
      expect(result.proteinPct).toBeGreaterThan(0);
      expect(result.carbsPct).toBeGreaterThan(0);
      expect(result.fatPct).toBeGreaterThan(0);
    });

    it("aggregates across multiple meals to form accurate daily totals", () => {
      const breakfast = [{ calories: 350, protein: 20, carbs: 40, fat: 12 }];
      const lunch = [{ calories: 600, protein: 45, carbs: 65, fat: 15 }];
      const dinner = [{ calories: 450, protein: 35, carbs: 30, fat: 18 }];
      const snacks = [{ calories: 150, protein: 5, carbs: 20, fat: 5 }];

      const daily = aggregateMacroDistribution([
        ...breakfast,
        ...lunch,
        ...dinner,
        ...snacks,
      ]);

      expect(daily.totalCalories).toBe(1550);
      expect(daily.totalProtein).toBe(105);
      expect(daily.totalCarbs).toBe(155);
      expect(daily.totalFat).toBe(50);
      expect(daily.proteinPct + daily.carbsPct + daily.fatPct).toBe(100);
    });
  });

  describe("shiftCalendarDay & Date Navigation", () => {
    it("shifts forward and backward by single or multiple days deterministically", () => {
      expect(shiftCalendarDay("2026-10-21", 1)).toBe("2026-10-22");
      expect(shiftCalendarDay("2026-10-21", -1)).toBe("2026-10-20");
      expect(shiftCalendarDay("2026-10-21", 5)).toBe("2026-10-26");
      expect(shiftCalendarDay("2026-10-21", -5)).toBe("2026-10-16");
    });

    it("handles month boundaries correctly across all calendar lengths", () => {
      // 30-day month boundary: April 30 -> May 1
      expect(shiftCalendarDay("2026-04-30", 1)).toBe("2026-05-01");
      expect(shiftCalendarDay("2026-05-01", -1)).toBe("2026-04-30");

      // 31-day month boundary: July 31 -> August 1
      expect(shiftCalendarDay("2026-07-31", 1)).toBe("2026-08-01");
      expect(shiftCalendarDay("2026-08-01", -1)).toBe("2026-07-31");
    });

    it("handles February month boundaries in non-leap years (28 days)", () => {
      // 2025 is not a leap year (Feb has 28 days)
      expect(shiftCalendarDay("2025-02-28", 1)).toBe("2025-03-01");
      expect(shiftCalendarDay("2025-03-01", -1)).toBe("2025-02-28");
    });

    it("handles February month boundaries in leap years (29 days)", () => {
      // 2024 was a leap year (Feb had 29 days)
      expect(shiftCalendarDay("2024-02-28", 1)).toBe("2024-02-29");
      expect(shiftCalendarDay("2024-02-29", 1)).toBe("2024-03-01");
      expect(shiftCalendarDay("2024-03-01", -1)).toBe("2024-02-29");
      expect(shiftCalendarDay("2024-02-29", -1)).toBe("2024-02-28");

      // 2028 is also a leap year
      expect(shiftCalendarDay("2028-02-28", 1)).toBe("2028-02-29");
      expect(shiftCalendarDay("2028-02-29", 1)).toBe("2028-03-01");
    });

    it("handles year boundaries seamlessly", () => {
      expect(shiftCalendarDay("2025-12-31", 1)).toBe("2026-01-01");
      expect(shiftCalendarDay("2026-01-01", -1)).toBe("2025-12-31");
      expect(shiftCalendarDay("2029-12-31", 2)).toBe("2030-01-02");
    });
  });

  describe("normalizeDateOnly", () => {
    it("preserves canonical YYYY-MM-DD date strings without timezone shifts", () => {
      expect(normalizeDateOnly("2026-10-21")).toBe("2026-10-21");
      expect(normalizeDateOnly("2025-01-01")).toBe("2025-01-01");
      expect(normalizeDateOnly("2024-02-29")).toBe("2024-02-29");
    });

    it("converts Date objects to canonical YYYY-MM-DD", () => {
      const d = new Date(2026, 4, 15); // May 15, 2026
      expect(normalizeDateOnly(d)).toBe("2026-05-15");
    });

    it("falls back to today if null, undefined, or invalid", () => {
      const todayPattern = /^\d{4}-\d{2}-\d{2}$/;
      expect(normalizeDateOnly(null)).toMatch(todayPattern);
      expect(normalizeDateOnly(undefined)).toMatch(todayPattern);
      expect(normalizeDateOnly("invalid-date-string")).toMatch(todayPattern);
    });
  });

  describe("Timezone Midnight Boundaries (formatInTimezone)", () => {
    it("correctly resolves timestamps around midnight for positive UTC offset (Asia/Kolkata +05:30)", async () => {
      const { formatInTimezone } = await import("@/lib/timezone");

      // 18:20 UTC on Oct 21 = 23:50 (late night) on Oct 21 in Asia/Kolkata
      const lateNightUtc = new Date("2026-10-21T18:20:00.000Z");
      expect(formatInTimezone(lateNightUtc, "UTC")).toBe("2026-10-21");
      expect(formatInTimezone(lateNightUtc, "Asia/Kolkata")).toBe("2026-10-21");

      // 18:45 UTC on Oct 21 = 00:15 (past midnight) on Oct 22 in Asia/Kolkata
      const pastMidnightUtc = new Date("2026-10-21T18:45:00.000Z");
      expect(formatInTimezone(pastMidnightUtc, "UTC")).toBe("2026-10-21");
      expect(formatInTimezone(pastMidnightUtc, "Asia/Kolkata")).toBe("2026-10-22");

      // 18:30 UTC on Oct 21 = exactly 00:00:00 on Oct 22 in Asia/Kolkata
      const exactMidnightUtc = new Date("2026-10-21T18:30:00.000Z");
      expect(formatInTimezone(exactMidnightUtc, "Asia/Kolkata")).toBe("2026-10-22");
    });

    it("correctly resolves timestamps around midnight for negative UTC offset (America/Los_Angeles -07:00)", async () => {
      const { formatInTimezone } = await import("@/lib/timezone");

      // 06:50 UTC on Oct 22 = 23:50 PDT on Oct 21 in America/Los_Angeles
      const lateNightPdt = new Date("2026-10-22T06:50:00.000Z");
      expect(formatInTimezone(lateNightPdt, "UTC")).toBe("2026-10-22");
      expect(formatInTimezone(lateNightPdt, "America/Los_Angeles")).toBe("2026-10-21");

      // 07:15 UTC on Oct 22 = 00:15 PDT on Oct 22 in America/Los_Angeles
      const pastMidnightPdt = new Date("2026-10-22T07:15:00.000Z");
      expect(formatInTimezone(pastMidnightPdt, "UTC")).toBe("2026-10-22");
      expect(formatInTimezone(pastMidnightPdt, "America/Los_Angeles")).toBe("2026-10-22");
    });
  });
});
