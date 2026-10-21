import { catalogFoods } from "../src/lib/catalog/food-catalog-data";

console.log("=== FOOD CATALOG VALIDATION ===");
console.log(`Total Food Items: ${catalogFoods.length}`);

const nameSet = new Set<string>();
const duplicates: string[] = [];
let invalidNutrients: string[] = [];
let missingPieceWeights: string[] = [];
let macroAnomalies: string[] = [];

const catCounts: Record<string, number> = {};

for (const item of catalogFoods) {
  catCounts[item.category] = (catCounts[item.category] || 0) + 1;

  // Duplicate name check
  const norm = item.name.toLowerCase().trim();
  if (nameSet.has(norm)) {
    duplicates.push(item.name);
  }
  nameSet.add(norm);

  // Nutrient check
  if (item.calories < 0 || item.protein < 0 || item.carbs < 0 || item.fat < 0) {
    invalidNutrients.push(`${item.name}: negative values`);
  }

  // Piece weight check
  if ((item.servingBasis === "per_piece" || item.servingBasis === "per_slice") && (!item.pieceWeightG || item.pieceWeightG <= 0)) {
    missingPieceWeights.push(`${item.name} (${item.servingBasis}): missing pieceWeightG`);
  }

  // MealType check
  const allowedMealTypes = ["breakfast", "lunch", "dinner", "snack", "any"];
  if (!allowedMealTypes.includes(item.mealType)) {
    invalidNutrients.push(`${item.name}: invalid mealType '${item.mealType}'`);
  }

  // Macro calorie sanity (allow ±30% or fiber/sugar alcohol discrepancies)
  const estKcal = item.protein * 4 + item.carbs * 4 + item.fat * 9;
  if (item.calories > 15 && Math.abs(estKcal - item.calories) > item.calories * 0.45 && Math.abs(estKcal - item.calories) > 20) {
    macroAnomalies.push(`${item.name}: reported ${item.calories} vs est 4/4/9 ${Math.round(estKcal)} (diff ${Math.round(estKcal - item.calories)})`);
  }
}

console.log("Category counts:", catCounts);
console.log(`Duplicates (${duplicates.length}):`, duplicates);
console.log(`Invalid nutrients / enums (${invalidNutrients.length}):`, invalidNutrients);
console.log(`Missing piece weights (${missingPieceWeights.length}):`, missingPieceWeights);
console.log(`Macro anomalies (${macroAnomalies.length}):`, macroAnomalies);

import { catalogExercises } from "../src/lib/catalog/exercise-catalog-data";
import { AvailableEquipment, AvailableExerciseCategories, AvailableMuscleGroups } from "../src/constants";

console.log("\n=== EXERCISE CATALOG VALIDATION ===");
console.log(`Total Exercise Items: ${catalogExercises.length}`);

const exNameSet = new Set<string>();
const exDuplicates: string[] = [];
const invalidMuscles: string[] = [];
const invalidEquipment: string[] = [];
const invalidCategories: string[] = [];

const exMuscleDist: Record<string, number> = {};
const exEquipDist: Record<string, number> = {};
const exCatDist: Record<string, number> = {};

for (const ex of catalogExercises) {
  exMuscleDist[ex.targetMuscle] = (exMuscleDist[ex.targetMuscle] || 0) + 1;
  exEquipDist[ex.equipment] = (exEquipDist[ex.equipment] || 0) + 1;
  exCatDist[ex.category] = (exCatDist[ex.category] || 0) + 1;

  const norm = ex.name.toLowerCase().trim();
  if (exNameSet.has(norm)) {
    exDuplicates.push(ex.name);
  }
  exNameSet.add(norm);

  if (!AvailableMuscleGroups.includes(ex.targetMuscle as any)) {
    invalidMuscles.push(`${ex.name}: invalid muscle ${ex.targetMuscle}`);
  }
  if (!AvailableEquipment.includes(ex.equipment as any)) {
    invalidEquipment.push(`${ex.name}: invalid equipment ${ex.equipment}`);
  }
  if (!AvailableExerciseCategories.includes(ex.category as any)) {
    invalidCategories.push(`${ex.name}: invalid category ${ex.category}`);
  }
}

console.log("Muscle distribution:", exMuscleDist);
console.log("Equipment distribution:", exEquipDist);
console.log("Category distribution:", exCatDist);
console.log(`Exercise Duplicates (${exDuplicates.length}):`, exDuplicates);
console.log(`Invalid muscles (${invalidMuscles.length}):`, invalidMuscles);
console.log(`Invalid equipment (${invalidEquipment.length}):`, invalidEquipment);
console.log(`Invalid categories (${invalidCategories.length}):`, invalidCategories);
