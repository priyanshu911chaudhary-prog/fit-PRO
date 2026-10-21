/**
 * Core Nutrition Calculation Engine
 * Shared single source of truth for nutrient scaling, unit conversions, and macro aggregations.
 * Used identically by backend API handlers and frontend state.
 */

export type ServingBasis =
  | "per_100g"
  | "per_100ml"
  | "per_piece"
  | "per_slice"
  | "per_serving";

export type SupportedUnit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "piece"
  | "item"
  | "slice"
  | "serving"
  | "cup"
  | "tbsp"
  | "tsp";

export interface CatalogNutritionBasis {
  name?: string;
  calories: number; // kcal per basis
  protein: number;  // grams per basis
  carbs: number;    // grams per basis
  fat: number;      // grams per basis
  servingBasis?: ServingBasis | string;
  servingUnit?: string;
  pieceWeightG?: number; // e.g. 50 for an egg
  servingWeightG?: number; // e.g. 30 for a standard portion
}

export interface NutrientYield {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  factor: number;
}

export interface MacroDistribution {
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

/**
 * Standard unit normalization: converts an input quantity and unit into the canonical
 * multiplier relative to the catalog entry's serving basis.
 * Rejects unsupported units, missing required weights, or negative/zero quantities.
 */
export function getServingMultiplier(
  quantity: number,
  unit: string | undefined,
  food: CatalogNutritionBasis
): number {
  if (typeof quantity !== "number" || isNaN(quantity) || !isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive number");
  }

  const normalizedUnit = (unit || food.servingUnit || "serving").trim().toLowerCase();
  const basis = food.servingBasis || "per_serving";

  switch (basis) {
    case "per_100g": {
      if (normalizedUnit === "g") {
        return quantity / 100;
      }
      if (normalizedUnit === "kg") {
        return (quantity * 1000) / 100;
      }
      if (
        (normalizedUnit === "piece" || normalizedUnit === "item") &&
        food.pieceWeightG &&
        food.pieceWeightG > 0
      ) {
        return (quantity * food.pieceWeightG) / 100;
      }
      if (normalizedUnit === "slice") {
        const weight = food.pieceWeightG || food.servingWeightG;
        if (weight && weight > 0) {
          return (quantity * weight) / 100;
        }
        throw new Error(
          `Cannot convert unit 'slice' to grams: slice weight is not configured for ${food.name || "this food"}`
        );
      }
      if (normalizedUnit === "serving") {
        if (food.servingWeightG && food.servingWeightG > 0) {
          return (quantity * food.servingWeightG) / 100;
        }
        throw new Error(
          `Cannot convert unit 'serving' to grams: serving weight is not configured for ${food.name || "this food"}`
        );
      }
      if (normalizedUnit === "piece" || normalizedUnit === "item") {
        throw new Error(
          `Cannot convert unit '${normalizedUnit}' to grams: piece weight is not configured for ${food.name || "this food"}`
        );
      }
      if (["ml", "l", "cup", "tbsp", "tsp"].includes(normalizedUnit)) {
        throw new Error(
          `Cannot convert volume unit '${normalizedUnit}' to mass-based food (per_100g) without density`
        );
      }
      throw new Error(
        `Unsupported unit '${normalizedUnit}' for food with per_100g basis`
      );
    }

    case "per_100ml": {
      if (normalizedUnit === "ml") {
        return quantity / 100;
      }
      if (normalizedUnit === "l") {
        return (quantity * 1000) / 100;
      }
      if (normalizedUnit === "cup") {
        return (quantity * 240) / 100;
      }
      if (normalizedUnit === "tbsp") {
        return (quantity * 15) / 100;
      }
      if (normalizedUnit === "tsp") {
        return (quantity * 5) / 100;
      }
      if (normalizedUnit === "serving") {
        if (food.servingWeightG && food.servingWeightG > 0) {
          return (quantity * food.servingWeightG) / 100;
        }
        throw new Error(
          `Cannot convert unit 'serving' to volume: serving size is not configured for ${food.name || "this food"}`
        );
      }
      if (["g", "kg"].includes(normalizedUnit)) {
        throw new Error(
          `Cannot convert mass unit '${normalizedUnit}' to volume-based food (per_100ml) without density`
        );
      }
      throw new Error(
        `Unsupported unit '${normalizedUnit}' for food with per_100ml basis`
      );
    }

    case "per_piece": {
      if (normalizedUnit === "piece" || normalizedUnit === "item" || normalizedUnit === "serving") {
        return quantity;
      }
      const weight = food.pieceWeightG || food.servingWeightG;
      if (normalizedUnit === "g") {
        if (weight && weight > 0) {
          return quantity / weight;
        }
        throw new Error(
          `Cannot convert grams to pieces: piece weight is not configured for ${food.name || "this food"}`
        );
      }
      if (normalizedUnit === "kg") {
        if (weight && weight > 0) {
          return (quantity * 1000) / weight;
        }
        throw new Error(
          `Cannot convert kilograms to pieces: piece weight is not configured for ${food.name || "this food"}`
        );
      }
      if (["ml", "l", "cup", "tbsp", "tsp"].includes(normalizedUnit)) {
        throw new Error(
          `Cannot convert volume unit '${normalizedUnit}' to piece-based food`
        );
      }
      throw new Error(
        `Unsupported unit '${normalizedUnit}' for food with per_piece basis`
      );
    }

    case "per_slice": {
      if (normalizedUnit === "slice" || normalizedUnit === "piece" || normalizedUnit === "item" || normalizedUnit === "serving") {
        return quantity;
      }
      const weight = food.pieceWeightG || food.servingWeightG;
      if (normalizedUnit === "g") {
        if (weight && weight > 0) {
          return quantity / weight;
        }
        throw new Error(
          `Cannot convert grams to slices: slice weight is not configured for ${food.name || "this food"}`
        );
      }
      if (normalizedUnit === "kg") {
        if (weight && weight > 0) {
          return (quantity * 1000) / weight;
        }
        throw new Error(
          `Cannot convert kilograms to slices: slice weight is not configured for ${food.name || "this food"}`
        );
      }
      if (["ml", "l", "cup", "tbsp", "tsp"].includes(normalizedUnit)) {
        throw new Error(
          `Cannot convert volume unit '${normalizedUnit}' to slice-based food`
        );
      }
      throw new Error(
        `Unsupported unit '${normalizedUnit}' for food with per_slice basis`
      );
    }

    case "per_serving":
    default: {
      if (normalizedUnit === "serving") {
        return quantity;
      }
      if (food.servingUnit && normalizedUnit === food.servingUnit.trim().toLowerCase()) {
        return quantity;
      }
      const weight = food.servingWeightG || food.pieceWeightG;
      if (normalizedUnit === "g") {
        if (weight && weight > 0) {
          return quantity / weight;
        }
        throw new Error(
          `Cannot convert grams to servings: serving weight is not configured for ${food.name || "this food"}`
        );
      }
      if (normalizedUnit === "kg") {
        if (weight && weight > 0) {
          return (quantity * 1000) / weight;
        }
        throw new Error(
          `Cannot convert kilograms to servings: serving weight is not configured for ${food.name || "this food"}`
        );
      }
      if (
        (normalizedUnit === "piece" || normalizedUnit === "item" || normalizedUnit === "slice") &&
        food.pieceWeightG &&
        food.servingWeightG &&
        food.servingWeightG > 0
      ) {
        return (quantity * food.pieceWeightG) / food.servingWeightG;
      }
      if (["ml", "l", "cup", "tbsp", "tsp"].includes(normalizedUnit)) {
        throw new Error(
          `Cannot convert volume unit '${normalizedUnit}' to serving-based food without volume metadata`
        );
      }
      throw new Error(
        `Unsupported unit '${normalizedUnit}' for food with per_serving basis`
      );
    }
  }
}

/**
 * Calculates raw, unrounded nutrients for a single food item with given quantity and unit.
 * Safely handles missing/nullable nutrient values.
 */
export function calculateItemNutrients(
  food: CatalogNutritionBasis,
  quantity: number,
  unit?: string
): NutrientYield {
  const factor = getServingMultiplier(quantity, unit, food);

  const baseCalories = typeof food.calories === "number" && isFinite(food.calories) ? food.calories : 0;
  const baseProtein = typeof food.protein === "number" && isFinite(food.protein) ? food.protein : 0;
  const baseCarbs = typeof food.carbs === "number" && isFinite(food.carbs) ? food.carbs : 0;
  const baseFat = typeof food.fat === "number" && isFinite(food.fat) ? food.fat : 0;

  const calories = Math.max(0, baseCalories * factor);
  const protein = Math.max(0, baseProtein * factor);
  const carbs = Math.max(0, baseCarbs * factor);
  const fat = Math.max(0, baseFat * factor);

  return {
    calories,
    protein,
    carbs,
    fat,
    factor,
  };
}

/**
 * Sums unrounded contributions across items and computes macro distributions with safe rounding.
 */
export function aggregateMacroDistribution(
  items: Array<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>
): MacroDistribution {
  let rawCalories = 0;
  let rawProtein = 0;
  let rawCarbs = 0;
  let rawFat = 0;

  for (const item of items) {
    if (isFinite(item.calories) && item.calories > 0) rawCalories += item.calories;
    if (isFinite(item.protein) && item.protein > 0) rawProtein += item.protein;
    if (isFinite(item.carbs) && item.carbs > 0) rawCarbs += item.carbs;
    if (isFinite(item.fat) && item.fat > 0) rawFat += item.fat;
  }

  const totalCalories = Math.round(rawCalories);
  // Keep 1 decimal place internally rounded or integer
  const totalProtein = Math.round(rawProtein * 10) / 10;
  const totalCarbs = Math.round(rawCarbs * 10) / 10;
  const totalFat = Math.round(rawFat * 10) / 10;

  const proteinCals = Math.round(totalProtein * 4);
  const carbsCals = Math.round(totalCarbs * 4);
  const fatCals = Math.round(totalFat * 9);
  const macroCalSum = proteinCals + carbsCals + fatCals;

  let proteinPct = 0;
  let carbsPct = 0;
  let fatPct = 0;

  if (macroCalSum > 0) {
    proteinPct = Math.round((proteinCals / macroCalSum) * 100);
    carbsPct = Math.round((carbsCals / macroCalSum) * 100);
    fatPct = Math.max(0, 100 - proteinPct - carbsPct);
  }

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

/**
 * Shifts a canonical calendar date string (YYYY-MM-DD) by a given number of days.
 * Pure calendar arithmetic using UTC noon (12:00:00) to be completely immune to
 * local timezone offsets and Daylight Saving Time (DST) shifts.
 */
export function shiftCalendarDay(dateStr: string, days: number): string {
  const normalized = normalizeDateOnly(dateStr);
  const [y, m, d] = normalized.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const newY = utcDate.getUTCFullYear();
  const newM = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const newD = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${newY}-${newM}-${newD}`;
}

/**
 * Validates and formats a canonical date-only string (YYYY-MM-DD).
 * Never shifts an existing YYYY-MM-DD calendar date through timezone conversion.
 */
export function normalizeDateOnly(dateInput?: string | Date | null): string {
  if (!dateInput) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
