import "dotenv/config";
import mongoose from "mongoose";
import { Exercise, IExercise } from "../src/models/exercise";
import { WorkoutLog } from "../src/models/workoutLog";
import { catalogExercises, ExerciseSeedItem } from "../src/lib/catalog/exercise-catalog-data";
import { invalidateCatalogCache } from "../src/lib/cache/redis-cache";

export interface ExerciseSeedReport {
  totalCatalogItems: number;
  inserted: number;
  updated: number;
  unchanged: number;
  duplicatesResolved: number;
  conflicts: number;
  skipped: number;
  isDryRun: boolean;
  wouldInsert: number;
  wouldUpdate: number;
  wouldResolveDuplicates: number;
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

export async function seedExercises(options?: { dryRun?: boolean }): Promise<ExerciseSeedReport> {
  const isDryRun = options?.dryRun ?? process.argv.includes("--dry-run");

  const report: ExerciseSeedReport = {
    totalCatalogItems: catalogExercises.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    duplicatesResolved: 0,
    conflicts: 0,
    skipped: 0,
    isDryRun,
    wouldInsert: 0,
    wouldUpdate: 0,
    wouldResolveDuplicates: 0,
  };

  try {
    await connectToMongo();
    console.log(`[seed-exercises] ${isDryRun ? "DRY RUN MODE" : "Connected to MongoDB"}. Auditing and seeding ${catalogExercises.length} exercises...`);

    const existingExercises = await Exercise.find().lean();

    // Check referenced exercise IDs in WorkoutLog so we never delete a referenced exercise
    const workoutLogs = await WorkoutLog.find().lean();
    const referencedExIds = new Set<string>();
    for (const log of workoutLogs) {
      for (const ex of (log.exercises || [])) {
        if (ex.exerciseId) {
          const exObj = ex.exerciseId as unknown;
          const id =
            typeof exObj === "object" && exObj !== null && "_id" in (exObj as Record<string, unknown>)
              ? (exObj as Record<string, unknown>)._id
              : exObj;
          referencedExIds.add(String(id));
        }
      }
    }

    // Map existing exercises by exact lowercase name and normalized alphanumeric name
    const existingByName = new Map<string, typeof existingExercises[0]>();
    const existingByNorm = new Map<string, Array<typeof existingExercises[0]>>();

    for (const ex of existingExercises) {
      existingByName.set(ex.name.toLowerCase().trim(), ex);
      const norm = ex.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const list = existingByNorm.get(norm) || [];
      list.push(ex);
      existingByNorm.set(norm, list);
    }

    // Step 1: Resolve internal duplicates in DB (multiple records with the same normalized alphanumeric name)
    const removedIds = new Set<string>();

    for (const [norm, exList] of existingByNorm.entries()) {
      if (exList.length > 1) {
        // Find if any is referenced
        const referenced = exList.filter((e) => referencedExIds.has(String(e._id)));
        const unreferenced = exList.filter((e) => !referencedExIds.has(String(e._id)));

        // Keep one primary record and merge aliases from redundant unreferenced duplicates
        let primary = referenced.length > 0 ? referenced[0] : exList[0];
        const secondary = exList.filter((e) => String(e._id) !== String(primary._id));

        for (const sec of secondary) {
          // If secondary is NOT referenced, it is safe to merge into primary aliases
          if (!referencedExIds.has(String(sec._id))) {
            removedIds.add(String(sec._id));
            if (isDryRun) {
              report.wouldResolveDuplicates++;
            } else {
              report.duplicatesResolved++;
              await Exercise.deleteOne({ _id: sec._id });
              await Exercise.updateOne(
                { _id: primary._id },
                { $addToSet: { aliases: sec.name } }
              );
            }
          }
        }
      }
    }

    // Step 2: Seed curated exercises
    for (const item of catalogExercises) {
      const exactMatch = existingByName.get(item.name.toLowerCase().trim());
      const norm = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normMatches = (existingByNorm.get(norm) || []).filter((e) => !removedIds.has(String(e._id)));

      const existing = exactMatch || (normMatches.length > 0 ? normMatches[0] : null);

      if (!existing) {
        if (isDryRun) {
          report.wouldInsert++;
        } else {
          report.inserted++;
          await Exercise.create(item);
        }
      } else {
        const isExactMatch =
          existing.name === item.name &&
          existing.targetMuscle === item.targetMuscle &&
          existing.equipment === item.equipment &&
          existing.category === item.category;

        if (isExactMatch) {
          report.unchanged++;
        } else {
          if (isDryRun) {
            report.wouldUpdate++;
          } else {
            report.updated++;
            await Exercise.updateOne(
              { _id: existing._id },
              {
                $set: {
                  name: item.name,
                  targetMuscle: item.targetMuscle,
                  equipment: item.equipment,
                  category: item.category,
                },
                $addToSet: {
                  aliases: { $each: [...item.aliases, existing.name] },
                },
              }
            );
          }
        }
      }
    }

    // Invalidate cached catalog snapshot only on actual writes (never on dry-run)
    if (!isDryRun && (report.inserted > 0 || report.updated > 0 || report.duplicatesResolved > 0)) {
      try {
        await invalidateCatalogCache("exercises");
      } catch (err) {
        console.warn("[seed-exercises] Redis cache invalidation skipped or failed:", err);
      }
    }

    console.log("\n=== EXERCISE CATALOG SEED REPORT ===");
    console.log(`Dry Run:             ${report.isDryRun ? "YES (No writes performed)" : "NO (Database updated)"}`);
    console.log(`Total Curated:       ${report.totalCatalogItems}`);
    console.log(`Inserted:            ${report.inserted}${report.isDryRun ? ` (Would Insert: ${report.wouldInsert})` : ""}`);
    console.log(`Updated:             ${report.updated}${report.isDryRun ? ` (Would Update: ${report.wouldUpdate})` : ""}`);
    console.log(`Unchanged:           ${report.unchanged}`);
    console.log(`Duplicates Resolved: ${report.duplicatesResolved}${report.isDryRun ? ` (Would Resolve: ${report.wouldResolveDuplicates})` : ""}`);
    console.log(`Conflicts:           ${report.conflicts}`);
    console.log("====================================\n");

    return report;
  } catch (error) {
    console.error("❌ Failed to seed exercises:", error);
    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0 && process.argv[1]?.includes("seed-exercises")) {
      await mongoose.disconnect();
    }
  }
}

if (process.argv[1]?.includes("seed-exercises")) {
  seedExercises()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
