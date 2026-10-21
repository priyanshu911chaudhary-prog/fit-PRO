import "dotenv/config";
import mongoose from "mongoose";

export interface ReconciliationReport {
  isDryRun: boolean;
  totalLegacyEvaluated: number;
  exactEquivalentsMerged: number;
  exactEquivalentsAlreadyReconciled: number;
  preservedHistorical: number;
  preservedAmbiguous: number;
  preservedVariations: number;
  skippedDueToReferences: number;
  initialDbExerciseCount: number;
  finalDbExerciseCount: number;
  details: Array<{
    id: string;
    name: string;
    action: string;
    classification: string;
    targetCuratedName?: string;
    notes: string;
  }>;
}

// 1. Explicit, reviewable mapping of 28 Exact Semantic Equivalents
export const EXACT_LEGACY_MAPPINGS: Record<string, { legacyName: string; targetCuratedName: string }> = {
  "6ad37e0ff71b1eb858a1f26d": { legacyName: "Walking Lunges", targetCuratedName: "Walking Lunges (Bodyweight)" },
  "6ad37e0ff71b1eb858a1f270": { legacyName: "Reverse Lunges", targetCuratedName: "Reverse Lunges (Bodyweight)" },
  "6ad37e0ff71b1eb858a1f276": { legacyName: "Triceps Push-ups", targetCuratedName: "Tricep Push-ups" },
  "6ad37e0ff71b1eb858a1f278": { legacyName: "Calf Raises", targetCuratedName: "Standing Bodyweight Calf Raises" },
  "6ad38247f71b1eb858a1f37a": { legacyName: "Dumbbell Goblet Squats", targetCuratedName: "Goblet Squats" },
  "6ad38247f71b1eb858a1f37b": { legacyName: "Dumbbell Romanian Deadlifts", targetCuratedName: "Romanian Deadlift (Dumbbell)" },
  "6ad38247f71b1eb858a1f37c": { legacyName: "Dumbbell Walking Lunges", targetCuratedName: "Walking Lunges (Dumbbell)" },
  "6ad38247f71b1eb858a1f380": { legacyName: "Single-Arm Dumbbell Row", targetCuratedName: "Single-Arm Dumbbell Rows" },
  "6ad38247f71b1eb858a1f381": { legacyName: "Dumbbell Reverse Flyes", targetCuratedName: "Rear Delt Dumbbell Flyes" },
  "6ad382a5f71b1eb858a1f3a1": { legacyName: "Dumbbell Pullovers", targetCuratedName: "Dumbbell Pullover" },
  "6ad382a5f71b1eb858a1f3a2": { legacyName: "Dumbbell Bulgarian Split Squats", targetCuratedName: "Bulgarian Split Squats (Dumbbell)" },
  "6ad382a5f71b1eb858a1f3a3": { legacyName: "Dumbbell Rear Delt Flyes", targetCuratedName: "Rear Delt Dumbbell Flyes" },
  "6ad382a5f71b1eb858a1f3a4": { legacyName: "Dumbbell Biceps Curls", targetCuratedName: "Dumbbell Bicep Curls" },
  "6ad382b1f71b1eb858a1f3aa": { legacyName: "Dumbbell Overhead Triceps Extension", targetCuratedName: "Overhead Dumbbell Triceps Extension" },
  "6ad382b1f71b1eb858a1f3a9": { legacyName: "Single-Leg Glute Bridge", targetCuratedName: "Single-Leg Glute Bridges" },
  "6ad382b1f71b1eb858a1f3ab": { legacyName: "Dumbbell Renegade Row", targetCuratedName: "Dumbbell Renegade Rows" },
  "6ad382b1f71b1eb858a1f3ac": { legacyName: "Dumbbell Russian Twist", targetCuratedName: "Weighted Russian Twists" },
  "6ad38338f71b1eb858a1f3d5": { legacyName: "Dumbbell Reverse Lunges", targetCuratedName: "Reverse Lunges (Dumbbell)" },
  "6ad38338f71b1eb858a1f3d6": { legacyName: "Lying Leg Raises", targetCuratedName: "Leg Raises" },
  "6ad38342f71b1eb858a1f3d8": { legacyName: "Overhead Dumbbell Tricep Extension", targetCuratedName: "Overhead Dumbbell Triceps Extension" },
  "6ad383adf71b1eb858a1f408": { legacyName: "Dumbbell Overhead Tricep Extension", targetCuratedName: "Overhead Dumbbell Triceps Extension" },
  "6ad383b0f71b1eb858a1f40d": { legacyName: "Dumbbell Overhead Press", targetCuratedName: "Seated Dumbbell Shoulder Press" },
  "6ad383b0f71b1eb858a1f40f": { legacyName: "Dumbbell Skull Crushers", targetCuratedName: "Skull Crushers (Dumbbell)" },
  "6ad38a96f71b1eb858a1f69a": { legacyName: "Dumbbell Arnold Press", targetCuratedName: "Arnold Press" },
  "6ad38a96f71b1eb858a1f699": { legacyName: "Dumbbell Single-Arm Row", targetCuratedName: "Single-Arm Dumbbell Rows" },
  "6ad3a420f71b1eb858a1f903": { legacyName: "Dumbbell Step-ups", targetCuratedName: "Step-ups (Dumbbell)" },
  "6ad3a61ff71b1eb858a1f92e": { legacyName: "Dumbbell Single-Arm Rows", targetCuratedName: "Single-Arm Dumbbell Rows" },
  "6ad3aa6af71b1eb858a1f943": { legacyName: "Dumbbell Overhead Tricep Extensions", targetCuratedName: "Overhead Dumbbell Triceps Extension" },
};

// 2. Explicit Preserved Historical Record (referenced in historical WorkoutLog 6ad8f7404483bea87458597a)
export const PRESERVED_HISTORICAL_RECORDS: Record<string, { legacyName: string; targetMuscle: string; equipment: string; category: string; rationale: string }> = {
  "6ad38338f71b1eb858a1f3d4": {
    legacyName: "Bent-Over Dumbbell Rows",
    targetMuscle: "back",
    equipment: "dumbbell",
    category: "strength",
    rationale: "Referenced in historical workout log ('Back & Biceps', doc 6ad8f7404483bea87458597a). Must be preserved so historical log resolution remains intact. Reclassify invalid legacy placeholder full_body/bodyweight to back/dumbbell.",
  },
};

// 3. Explicit Preserved Ambiguous Composite Records (multi-movement names)
export const PRESERVED_AMBIGUOUS_RECORDS: Record<string, { legacyName: string; targetMuscle: string; equipment: string; category: string; rationale: string }> = {
  "6ad3a420f71b1eb858a1f905": {
    legacyName: "Pull-ups or Bodyweight Rows",
    targetMuscle: "back",
    equipment: "bodyweight",
    category: "strength",
    rationale: "Composite exercise name containing multiple alternative movements ('or'). Cannot be automatically merged into a single curated item. Preserved as distinct exercise with corrected back/bodyweight classification.",
  },
  "6ad3a4d9f71b1eb858a1f916": {
    legacyName: "Pull-ups or Chin-ups",
    targetMuscle: "back",
    equipment: "bodyweight",
    category: "strength",
    rationale: "Composite exercise name containing multiple grip variations ('or'). Cannot be automatically merged into a single curated item. Preserved as distinct exercise with corrected back/bodyweight classification.",
  },
};

// 4. Explicit Preserved Valid Variations (semantically distinct, unspecified posture/angle, or unweighted/weighted variations)
export const PRESERVED_VARIATION_RECORDS: Record<string, { legacyName: string; targetMuscle: string; equipment: string; category: string; rationale: string }> = {
  "6ad37e0ff71b1eb858a1f271": {
    legacyName: "Superman",
    targetMuscle: "back",
    equipment: "bodyweight",
    category: "strength",
    rationale: "Dynamic repetitions prone extension versus isometric static hold ('Superman Hold'). Preserved as distinct movement.",
  },
  "6ad38247f71b1eb858a1f37d": {
    legacyName: "Single-Leg Calf Raises",
    targetMuscle: "legs",
    equipment: "bodyweight",
    category: "strength",
    rationale: "Unilateral bodyweight calf movement. Curated catalog only has bilateral bodyweight or dumbbell calf raises. Preserved as distinct movement.",
  },
  "6ad38247f71b1eb858a1f374": {
    legacyName: "Dumbbell Shoulder Press",
    targetMuscle: "shoulders",
    equipment: "dumbbell",
    category: "strength",
    rationale: "Generic dumbbell shoulder press with posture unspecified (standing vs seated). Preserved as distinct movement.",
  },
  "6ad383adf71b1eb858a1f406": {
    legacyName: "Dumbbell Lunges",
    targetMuscle: "legs",
    equipment: "dumbbell",
    category: "strength",
    rationale: "Generic dumbbell lunges with locomotion unspecified (walking vs stationary vs reverse). Preserved as distinct movement.",
  },
  "6ad38a96f71b1eb858a1f698": {
    legacyName: "Dumbbell Sumo Squats",
    targetMuscle: "legs",
    equipment: "dumbbell",
    category: "strength",
    rationale: "Wide-stance adductor-focused squat with dumbbell. Not present in curated catalog. Preserved as distinct movement.",
  },
  "6ad38a9af71b1eb858a1f69e": {
    legacyName: "Bodyweight Dips",
    targetMuscle: "arms",
    equipment: "bodyweight",
    category: "strength",
    rationale: "Generic parallel bar bodyweight dips without specific chest-lean or tricep-upright isolation. Preserved as distinct movement.",
  },
  "6ad3a420f71b1eb858a1f902": {
    legacyName: "Dumbbell Chest Press",
    targetMuscle: "chest",
    equipment: "dumbbell",
    category: "strength",
    rationale: "Generic chest press with dumbbells (flat, incline, or floor press). Preserved as distinct movement.",
  },
  "6ad3a420f71b1eb858a1f904": {
    legacyName: "Dumbbell Glute Bridges",
    targetMuscle: "legs",
    equipment: "dumbbell",
    category: "strength",
    rationale: "Weighted glute bridge using dumbbells. Curated catalog only contains unweighted bodyweight or banded glute bridges. Preserved as distinct movement.",
  },
  "6ad3a4d9f71b1eb858a1f917": {
    legacyName: "Dumbbell Tricep Extensions",
    targetMuscle: "arms",
    equipment: "dumbbell",
    category: "strength",
    rationale: "Generic dumbbell tricep extensions (angle unspecified). Preserved as distinct movement.",
  },
};

export function checkProductionSafety(uri: string) {
  const isProd =
    /mongodb\+srv:\/\/.*prod/i.test(uri) ||
    /production/i.test(uri) ||
    (process.env.NODE_ENV === "production" && !/127\.0\.0\.1|localhost/i.test(uri));

  if (isProd && process.env.ALLOW_PRODUCTION_MIGRATION !== "true") {
    throw new Error(
      "CRITICAL SAFETY GUARD: Attempting to modify a production database without explicit authorization. " +
        "To proceed, you must set ALLOW_PRODUCTION_MIGRATION=true."
    );
  }
}

/**
 * Scans all collections in the MongoDB database to find any references to exercise IDs.
 */
async function findReferencedExerciseIds(db: mongoose.mongo.Db): Promise<Set<string>> {
  const referencedIds = new Set<string>();
  const collections = await db.listCollections().toArray();

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const coll = db.collection(collName);

    if (collName === "workoutlogs") {
      const logs = await coll.find({}, { projection: { "exercises.exerciseId": 1 } }).toArray();
      for (const log of logs) {
        for (const ex of (log.exercises || [])) {
          if (ex.exerciseId) {
            referencedIds.add(String(ex.exerciseId));
          }
        }
      }
    } else if (collName === "workoutplans") {
      const plans = await coll.find({}, { projection: { "days.exercises.exerciseId": 1 } }).toArray();
      for (const plan of plans) {
        for (const day of (plan.days || [])) {
          for (const ex of (day.exercises || [])) {
            if (ex.exerciseId) {
              referencedIds.add(String(ex.exerciseId));
            }
          }
        }
      }
    }
  }

  return referencedIds;
}

export async function reconcileLegacyExercises(options?: { dryRun?: boolean }): Promise<ReconciliationReport> {
  const isDryRun = options?.dryRun ?? process.argv.includes("--dry-run");

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/fit-pro";
  checkProductionSafety(uri);

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }

  const db = mongoose.connection.db!;
  const exercisesColl = db.collection("exercises");

  const initialExercises = await exercisesColl.find().toArray();
  const initialCount = initialExercises.length;

  console.log(`[reconcile-exercises] Initial DB exercise count: ${initialCount} (${isDryRun ? "DRY-RUN MODE - NO WRITES" : "LIVE MODE"})`);

  // 1. Scan DB for any referenced exercise IDs
  const referencedExIds = await findReferencedExerciseIds(db);
  console.log(`[reconcile-exercises] Total referenced exercise IDs across database: ${referencedExIds.size}`);

  const report: ReconciliationReport = {
    isDryRun,
    totalLegacyEvaluated: 40,
    exactEquivalentsMerged: 0,
    exactEquivalentsAlreadyReconciled: 0,
    preservedHistorical: 0,
    preservedAmbiguous: 0,
    preservedVariations: 0,
    skippedDueToReferences: 0,
    initialDbExerciseCount: initialCount,
    finalDbExerciseCount: initialCount,
    details: [],
  };

  // Build ID lookup maps
  const exById = new Map(initialExercises.map((e) => [String(e._id), e]));
  const exByName = new Map(initialExercises.map((e) => [e.name.toLowerCase().trim(), e]));

  // Attempt transaction if supported (replica set)
  let session: mongoose.mongo.ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
  } catch {
    session = null;
  }

  try {
    // Phase 1: Reconcile 28 Exact Semantic Equivalents
    for (const [legacyId, mapInfo] of Object.entries(EXACT_LEGACY_MAPPINGS)) {
      const legacyDoc = exById.get(legacyId);

      if (!legacyDoc) {
        // Record already removed in a previous run (Idempotent!)
        report.exactEquivalentsAlreadyReconciled++;
        report.details.push({
          id: legacyId,
          name: mapInfo.legacyName,
          action: "already_reconciled",
          classification: "exact_equivalent",
          targetCuratedName: mapInfo.targetCuratedName,
          notes: "Legacy record does not exist in DB (already reconciled). Target curated exercise exists.",
        });
        continue;
      }

      // Check if reference appeared
      if (referencedExIds.has(legacyId)) {
        console.warn(`[SAFETY TRIGGER] Legacy record ${legacyId} (${mapInfo.legacyName}) is referenced! Skipping deletion.`);
        report.skippedDueToReferences++;
        report.details.push({
          id: legacyId,
          name: mapInfo.legacyName,
          action: "skipped_referenced",
          classification: "exact_equivalent",
          targetCuratedName: mapInfo.targetCuratedName,
          notes: "Safety trigger: Record has active references in database. Preserved without deletion.",
        });
        continue;
      }

      // Find target curated exercise
      const targetCuratedDoc = exByName.get(mapInfo.targetCuratedName.toLowerCase().trim());
      if (!targetCuratedDoc) {
        throw new Error(
          `Target curated exercise "${mapInfo.targetCuratedName}" not found in DB! Cannot merge "${mapInfo.legacyName}".`
        );
      }

      if (!isDryRun) {
        // 1. Add legacy name to curated exercise aliases (if not already present)
        await exercisesColl.updateOne(
          { _id: targetCuratedDoc._id },
          { $addToSet: { aliases: mapInfo.legacyName } },
          { session: session || undefined }
        );

        // 2. Safely delete the unreferenced redundant legacy record
        await exercisesColl.deleteOne({ _id: legacyDoc._id }, { session: session || undefined });
      }

      report.exactEquivalentsMerged++;
      report.details.push({
        id: legacyId,
        name: mapInfo.legacyName,
        action: isDryRun ? "dry_run_merge" : "merged_and_deleted",
        classification: "exact_equivalent",
        targetCuratedName: mapInfo.targetCuratedName,
        notes: `Merged into curated "${mapInfo.targetCuratedName}" aliases and deleted unreferenced legacy record.`,
      });
    }

    // Phase 2: Preserve and Reclassify Historical Referenced Record
    for (const [legacyId, histInfo] of Object.entries(PRESERVED_HISTORICAL_RECORDS)) {
      const doc = exById.get(legacyId);
      if (doc) {
        if (!isDryRun) {
          await exercisesColl.updateOne(
            { _id: doc._id },
            {
              $set: {
                targetMuscle: histInfo.targetMuscle,
                equipment: histInfo.equipment,
                category: histInfo.category,
              },
            },
            { session: session || undefined }
          );
        }
        report.preservedHistorical++;
        report.details.push({
          id: legacyId,
          name: histInfo.legacyName,
          action: isDryRun ? "dry_run_preserve" : "preserved_and_reclassified",
          classification: "referenced_historical",
          notes: histInfo.rationale,
        });
      }
    }

    // Phase 3: Preserve Ambiguous Composite Records
    for (const [legacyId, ambInfo] of Object.entries(PRESERVED_AMBIGUOUS_RECORDS)) {
      const doc = exById.get(legacyId);
      if (doc) {
        if (!isDryRun) {
          await exercisesColl.updateOne(
            { _id: doc._id },
            {
              $set: {
                targetMuscle: ambInfo.targetMuscle,
                equipment: ambInfo.equipment,
                category: ambInfo.category,
              },
            },
            { session: session || undefined }
          );
        }
        report.preservedAmbiguous++;
        report.details.push({
          id: legacyId,
          name: ambInfo.legacyName,
          action: isDryRun ? "dry_run_preserve" : "preserved_and_reclassified",
          classification: "ambiguous_composite",
          notes: ambInfo.rationale,
        });
      }
    }

    // Phase 4: Preserve Valid Variations
    for (const [legacyId, varInfo] of Object.entries(PRESERVED_VARIATION_RECORDS)) {
      const doc = exById.get(legacyId);
      if (doc) {
        if (!isDryRun) {
          await exercisesColl.updateOne(
            { _id: doc._id },
            {
              $set: {
                targetMuscle: varInfo.targetMuscle,
                equipment: varInfo.equipment,
                category: varInfo.category,
              },
            },
            { session: session || undefined }
          );
        }
        report.preservedVariations++;
        report.details.push({
          id: legacyId,
          name: varInfo.legacyName,
          action: isDryRun ? "dry_run_preserve" : "preserved_and_reclassified",
          classification: "valid_variation",
          notes: varInfo.rationale,
        });
      }
    }

    if (session) {
      await session.commitTransaction();
      await session.endSession();
    }
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      await session.endSession();
    }
    throw err;
  }

  // Get final count
  const finalExercises = await exercisesColl.find().toArray();
  report.finalDbExerciseCount = finalExercises.length;

  console.log(`[reconcile-exercises] Reconciliation finished.`);
  console.log(`  Initial count: ${report.initialDbExerciseCount}`);
  console.log(`  Final count: ${report.finalDbExerciseCount}`);
  console.log(`  Exact equivalents merged: ${report.exactEquivalentsMerged}`);
  console.log(`  Exact equivalents already reconciled: ${report.exactEquivalentsAlreadyReconciled}`);
  console.log(`  Preserved historical: ${report.preservedHistorical}`);
  console.log(`  Preserved ambiguous: ${report.preservedAmbiguous}`);
  console.log(`  Preserved variations: ${report.preservedVariations}`);
  console.log(`  Skipped due to references: ${report.skippedDueToReferences}`);

  return report;
}

// Allow direct CLI execution
if (require.main === module) {
  reconcileLegacyExercises()
    .then((r) => {
      console.log("[reconcile-exercises] Completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[reconcile-exercises] Failed:", err);
      process.exit(1);
    });
}
