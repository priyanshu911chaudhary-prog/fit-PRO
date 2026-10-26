import { Exercise } from "@/models/exercise";
import { FoodItem } from "@/models/foodItem";
import { getCachedOrFetch, getCatalogVersion } from "@/lib/cache/redis-cache";

export const CATALOG_CACHE_TTL = 600; // 10 minutes (bounded TTL)

export interface CachedExercise {
  _id: string;
  name: string;
  targetMuscle: string;
  equipment: string;
  category: string;
  aliases: string[];
}

export interface CachedFoodItem {
  _id: string;
  name: string;
  aliases?: string[];
  category: string;
  mealType?: string;
  dietaryPreference?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingBasis?: string;
  servingUnit?: string;
  pieceWeightG?: number;
  servingWeightG?: number;
  defaultQuantity?: number;
  isActive: boolean;
}

/**
 * Loads and caches the full exercise catalog snapshot.
 * Bounded TTL: 10 minutes.
 * Invalidated by version bump on real insertions or seed modifications.
 */
export async function getCachedExerciseCatalog(): Promise<CachedExercise[]> {
  const version = await getCatalogVersion("exercises");
  const cacheKey = `catalog:exercises:snapshot:v${version}`;

  const result = await getCachedOrFetch(cacheKey, CATALOG_CACHE_TTL, async () => {
    const docs = await Exercise.find().sort({ name: 1 }).lean();
    return docs.map((doc) => ({
      _id: String(doc._id),
      name: doc.name,
      targetMuscle: doc.targetMuscle,
      equipment: doc.equipment,
      category: doc.category,
      aliases: (doc.aliases || []).map(String),
    }));
  });

  return result.data;
}

/**
 * Loads and caches the active food catalog snapshot.
 * Bounded TTL: 10 minutes.
 * Invalidated by version bump on real insertions or seed modifications.
 */
export async function getCachedFoodCatalog(): Promise<CachedFoodItem[]> {
  const version = await getCatalogVersion("foods");
  const cacheKey = `catalog:foods:snapshot:v${version}`;

  const result = await getCachedOrFetch(cacheKey, CATALOG_CACHE_TTL, async () => {
    const docs = await FoodItem.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    return docs.map((doc) => ({
      _id: String(doc._id),
      name: doc.name,
      aliases: (doc.aliases || []).map(String),
      category: doc.category,
      mealType: doc.mealType,
      dietaryPreference: doc.dietaryPreference,
      calories: doc.calories,
      protein: doc.protein,
      carbs: doc.carbs,
      fat: doc.fat,
      servingBasis: doc.servingBasis,
      servingUnit: doc.servingUnit,
      pieceWeightG: doc.pieceWeightG,
      servingWeightG: doc.servingWeightG,
      defaultQuantity: doc.defaultQuantity,
      isActive: doc.isActive !== false,
    }));
  });

  return result.data;
}
