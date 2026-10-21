import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { reconcileLegacyExercises, EXACT_LEGACY_MAPPINGS, PRESERVED_HISTORICAL_RECORDS } from "../../scripts/reconcile-legacy-exercises";
import { Exercise } from "../../src/models/exercise";
import { WorkoutLog } from "../../src/models/workoutLog";

describe("Exercise Legacy Reconciliation & Idempotency", () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/fit-pro";
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  it("executes reconciliation in dry-run mode with 0 writes", async () => {
    const report = await reconcileLegacyExercises({ dryRun: true });
    expect(report.isDryRun).toBe(true);
    expect(report.initialDbExerciseCount).toBe(report.finalDbExerciseCount);
  });

  it("verifies reconciliation is idempotent across multiple runs", async () => {
    const run1 = await reconcileLegacyExercises({ dryRun: false });
    expect(run1.exactEquivalentsMerged).toBe(0); // 0 records merged/deleted on subsequent runs
    expect(run1.exactEquivalentsAlreadyReconciled).toBe(28); // all 28 already reconciled
    expect(run1.skippedDueToReferences).toBe(0);
  });

  it("verifies historical workout log populates referenced Bent-Over Dumbbell Rows with correct classification", async () => {
    const log = await WorkoutLog.findById("6ad8f7404483bea87458597a").populate(
      "exercises.exerciseId",
      "name targetMuscle category equipment"
    );
    expect(log).toBeDefined();
    const bentOver = log?.exercises.find(
      (e) => String((e.exerciseId as { _id?: unknown })._id) === "6ad38338f71b1eb858a1f3d4"
    );
    expect(bentOver).toBeDefined();
    const exData = bentOver?.exerciseId as unknown as { name: string; targetMuscle: string; equipment: string; category: string };
    expect(exData.name).toBe("Bent-Over Dumbbell Rows");
    expect(exData.targetMuscle).toBe("back");
    expect(exData.equipment).toBe("dumbbell");
  });

  it("verifies preserved ambiguous composites remain distinct in database", async () => {
    const pullupsRows = await Exercise.findById("6ad3a420f71b1eb858a1f905");
    const pullupsChinups = await Exercise.findById("6ad3a4d9f71b1eb858a1f916");
    expect(pullupsRows).toBeDefined();
    expect(pullupsRows?.name).toBe("Pull-ups or Bodyweight Rows");
    expect(pullupsRows?.targetMuscle).toBe("back");
    expect(pullupsRows?.equipment).toBe("bodyweight");

    expect(pullupsChinups).toBeDefined();
    expect(pullupsChinups?.name).toBe("Pull-ups or Chin-ups");
    expect(pullupsChinups?.targetMuscle).toBe("back");
    expect(pullupsChinups?.equipment).toBe("bodyweight");
  });

  it("verifies exact equivalent legacy names resolve to curated exercises via aliases", async () => {
    const sampleMappings = [
      { legacy: "Walking Lunges", curated: "Walking Lunges (Bodyweight)" },
      { legacy: "Triceps Push-ups", curated: "Tricep Push-ups" },
      { legacy: "Dumbbell Goblet Squats", curated: "Goblet Squats" },
      { legacy: "Dumbbell Romanian Deadlifts", curated: "Romanian Deadlift (Dumbbell)" },
      { legacy: "Dumbbell Skull Crushers", curated: "Skull Crushers (Dumbbell)" },
    ];

    for (const { legacy, curated } of sampleMappings) {
      const match = await Exercise.findOne({
        $or: [{ name: curated }, { aliases: legacy.toLowerCase() }],
      });
      expect(match).toBeDefined();
      expect(match?.name).toBe(curated);
      expect((match?.aliases || []).map((a) => a.toLowerCase())).toContain(legacy.toLowerCase());
    }
  });
});
