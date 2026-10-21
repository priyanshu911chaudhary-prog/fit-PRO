import "dotenv/config";
import mongoose from "mongoose";
import { FoodItem } from "../src/models/foodItem";
import { MealLog } from "../src/models/mealLog";
import { formatInTimezone } from "../src/lib/timezone";
import { catalogFoods, FoodSeedItem } from "../src/lib/catalog/food-catalog-data";

export interface SeedReport {
  totalCatalogItems: number;
  inserted: number;
  updated: number;
  unchanged: number;
  duplicatesResolved: number;
  conflicts: number;
  skipped: number;
  legacyDeactivated: number;
  backfilledMealLogs: number;
  isDryRun: boolean;
}

function checkProductionSafety(uri: string) {
  const isProd =
    /mongodb\+srv:\/\/.*prod/i.test(uri) ||
    /production/i.test(uri) ||
    (process.env.NODE_ENV === "production" && !/127\.0\.0\.1|localhost/i.test(uri));

  if (isProd && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "CRITICAL SAFETY GUARD: Attempting to seed a production database without explicit authorization. " +
        "To proceed, you must set ALLOW_PRODUCTION_SEED=true."
    );
  }
}

async function connectToMongo() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("No MongoDB URI found in environment variables");
  checkProductionSafety(uri);
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }
}

export async function backfillLegacyMealLogs(isDryRun: boolean = false): Promise<number> {
  const timeZone = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata";
  const legacyLogs = await MealLog.find({
    $or: [{ consumedDate: { $exists: false } }, { mealType: { $exists: false } }],
  });

  if (legacyLogs.length === 0) return 0;
  if (isDryRun) return legacyLogs.length;

  let updated = 0;
  for (const log of legacyLogs) {
    const rawDate = log.createdAt ? new Date(log.createdAt) : new Date();
    const consumedDate = formatInTimezone(rawDate, timeZone);

    let mealType: "breakfast" | "lunch" | "dinner" | "snack" = "snack";
    if (log.title) {
      const lower = log.title.toLowerCase();
      if (lower.includes("breakfast")) mealType = "breakfast";
      else if (lower.includes("lunch")) mealType = "lunch";
      else if (lower.includes("dinner")) mealType = "dinner";
      else if (lower.includes("snack")) mealType = "snack";
    }

    log.consumedDate = consumedDate;
    log.mealType = mealType;
    await log.save();
    updated++;
  }

  return updated;
}

export async function seedMeals(options?: { dryRun?: boolean }): Promise<SeedReport> {
  const isDryRun = options?.dryRun ?? process.argv.includes("--dry-run");

  const report: SeedReport = {
    totalCatalogItems: catalogFoods.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    duplicatesResolved: 0,
    conflicts: 0,
    skipped: 0,
    legacyDeactivated: 0,
    backfilledMealLogs: 0,
    isDryRun,
  };

  try {
    await connectToMongo();
    console.log(`[seed-meals] ${isDryRun ? "DRY RUN MODE" : "Connected to MongoDB"}. Auditing and seeding ${catalogFoods.length} foods...`);

    const existingFoods = await FoodItem.find().lean();

    // Check referenced food IDs in MealLog so we never delete a referenced food
    const mealLogs = await MealLog.find().lean();
    const referencedFoodIds = new Set<string>();
    for (const log of mealLogs) {
      for (const item of (log.meals || [])) {
        if (item.foodItemId) referencedFoodIds.add(String(item.foodItemId));
      }
    }

    const existingByName = new Map<string, typeof existingFoods[0]>();
    const existingByNorm = new Map<string, Array<typeof existingFoods[0]>>();

    for (const f of existingFoods) {
      existingByName.set(f.name.toLowerCase().trim(), f);
      const norm = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const list = existingByNorm.get(norm) || [];
      list.push(f);
      existingByNorm.set(norm, list);
    }

    // Step 1: Resolve internal duplicates in DB
    const removedIds = new Set<string>();
    for (const [norm, fList] of existingByNorm.entries()) {
      if (fList.length > 1) {
        const referenced = fList.filter((f) => referencedFoodIds.has(String(f._id)));
        let primary = referenced.length > 0 ? referenced[0] : fList[0];
        const secondary = fList.filter((f) => String(f._id) !== String(primary._id));

        for (const sec of secondary) {
          if (!referencedFoodIds.has(String(sec._id))) {
            report.duplicatesResolved++;
            removedIds.add(String(sec._id));
            if (!isDryRun) {
              await FoodItem.deleteOne({ _id: sec._id });
              await FoodItem.updateOne(
                { _id: primary._id },
                { $addToSet: { aliases: sec.name } }
              );
            }
          }
        }
      }
    }

    const curatedNorms = new Set<string>();

    for (const item of catalogFoods) {
      const norm = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      curatedNorms.add(norm);

      const exactMatch = existingByName.get(item.name.toLowerCase().trim());
      const normMatches = (existingByNorm.get(norm) || []).filter((f) => !removedIds.has(String(f._id)));
      const existing = exactMatch || (normMatches.length > 0 ? normMatches[0] : null);

      if (!existing) {
        report.inserted++;
        if (!isDryRun) {
          await FoodItem.create(item);
        }
      } else {
        // Check if values match
        const isExactMatch =
          existing.name === item.name &&
          existing.calories === item.calories &&
          existing.protein === item.protein &&
          existing.carbs === item.carbs &&
          existing.fat === item.fat &&
          existing.servingBasis === item.servingBasis &&
          existing.servingUnit === item.servingUnit &&
          existing.isActive === true;

        if (isExactMatch) {
          report.unchanged++;
        } else {
          // Check for significant conflict with existing non-AI curated data
          const isLegacyAI = (existing as any).servingBasis === undefined;
          if (!isLegacyAI && Math.abs(existing.calories - item.calories) > 50) {
            report.conflicts++;
            console.warn(
              `⚠️ [Conflict] Food "${existing.name}" has calories ${existing.calories} in DB vs ${item.calories} in seed. Reconciling to authoritative seed.`
            );
          }

          report.updated++;
          if (!isDryRun) {
            await FoodItem.updateOne(
              { _id: existing._id },
              {
                $set: {
                  ...item,
                  isActive: true,
                },
              }
            );
          }
        }
      }
    }

    // Safely deactivate uncurated legacy items that are not in catalogFoods
    for (const f of existingFoods) {
      const norm = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!curatedNorms.has(norm) && f.isActive !== false) {
        report.legacyDeactivated++;
        if (!isDryRun) {
          await FoodItem.updateOne({ _id: f._id }, { $set: { isActive: false } });
        }
      }
    }

    report.backfilledMealLogs = await backfillLegacyMealLogs(isDryRun);

    console.log("\n=== MEAL CATALOG SEED REPORT ===");
    console.log(`Dry Run:             ${report.isDryRun ? "YES (No writes performed)" : "NO (Database updated)"}`);
    console.log(`Total Curated:       ${report.totalCatalogItems}`);
    console.log(`Inserted:            ${report.inserted}`);
    console.log(`Updated:             ${report.updated}`);
    console.log(`Unchanged:           ${report.unchanged}`);
    console.log(`Duplicates Resolved: ${report.duplicatesResolved}`);
    console.log(`Conflicts Handled:   ${report.conflicts}`);
    console.log(`Legacy Deactivated:  ${report.legacyDeactivated}`);
    console.log(`Backfilled Logs:     ${report.backfilledMealLogs}`);
    console.log("================================\n");

    return report;
  } catch (error) {
    console.error("❌ Failed to seed meals:", error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0 && process.argv[1]?.includes("seed-meals")) {
      await mongoose.disconnect();
    }
  }
}

if (process.argv[1]?.includes("seed-meals")) {
  seedMeals()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
