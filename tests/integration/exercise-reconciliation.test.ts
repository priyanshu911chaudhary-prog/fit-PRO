import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { reconcileLegacyExercises } from "../../scripts/reconcile-legacy-exercises";
import { Exercise } from "../../src/models/exercise";
import { WorkoutLog } from "../../src/models/workoutLog";

const SAMPLE_MAPPINGS = [
  { legacy: "Walking Lunges", curated: "Walking Lunges (Bodyweight)", targetMuscle: "legs", equipment: "bodyweight" },
  { legacy: "Triceps Push-ups", curated: "Tricep Push-ups", targetMuscle: "arms", equipment: "bodyweight" },
  { legacy: "Dumbbell Goblet Squats", curated: "Goblet Squats", targetMuscle: "legs", equipment: "dumbbell" },
  { legacy: "Dumbbell Romanian Deadlifts", curated: "Romanian Deadlift (Dumbbell)", targetMuscle: "legs", equipment: "dumbbell" },
  { legacy: "Dumbbell Skull Crushers", curated: "Skull Crushers (Dumbbell)", targetMuscle: "arms", equipment: "dumbbell" },
];

const FIXTURE_EXERCISE_IDS = [
  "6ad38338f71b1eb858a1f3d4", // Bent-Over Dumbbell Rows
  "6ad3a420f71b1eb858a1f905", // Pull-ups or Bodyweight Rows
  "6ad3a4d9f71b1eb858a1f916", // Pull-ups or Chin-ups
];

const FIXTURE_WORKOUT_LOG_ID = "6ad8f7404483bea87458597a";

describe("Exercise Legacy Reconciliation & Idempotency", () => {
  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fit-PRO-test";
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri);
    }

    // 1. Seed historical Bent-Over Dumbbell Rows record
    await Exercise.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId("6ad38338f71b1eb858a1f3d4") },
      {
        $set: {
          name: "Bent-Over Dumbbell Rows",
          targetMuscle: "back",
          equipment: "dumbbell",
          category: "strength",
        },
      },
      { upsert: true, new: true }
    );

    // 2. Seed preserved ambiguous composite exercise records
    await Exercise.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId("6ad3a420f71b1eb858a1f905") },
      {
        $set: {
          name: "Pull-ups or Bodyweight Rows",
          targetMuscle: "back",
          equipment: "bodyweight",
          category: "strength",
        },
      },
      { upsert: true, new: true }
    );

    await Exercise.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId("6ad3a4d9f71b1eb858a1f916") },
      {
        $set: {
          name: "Pull-ups or Chin-ups",
          targetMuscle: "back",
          equipment: "bodyweight",
          category: "strength",
        },
      },
      { upsert: true, new: true }
    );

    // 3. Seed historical workout log referencing Bent-Over Dumbbell Rows
    await WorkoutLog.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(FIXTURE_WORKOUT_LOG_ID) },
      {
        $set: {
          user: new mongoose.Types.ObjectId(),
          title: "Back & Biceps",
          exercises: [
            {
              exerciseId: new mongoose.Types.ObjectId("6ad38338f71b1eb858a1f3d4"),
              sets: 3,
              reps: 10,
            },
          ],
          date: "2026-01-01",
          totalDuration: 45,
        },
      },
      { upsert: true, new: true }
    );

    // 4. Seed curated exercises with expected aliases for legacy reconciliation assertions
    for (const item of SAMPLE_MAPPINGS) {
      await Exercise.findOneAndUpdate(
        { name: item.curated },
        {
          $set: {
            name: item.curated,
            targetMuscle: item.targetMuscle,
            equipment: item.equipment,
            category: "strength",
          },
          $addToSet: {
            aliases: { $each: [item.legacy, item.legacy.toLowerCase()] },
          },
        },
        { upsert: true, new: true }
      );
    }
  }, 30000);

  afterAll(async () => {
    // Clean up all deterministic fixtures created for this suite
    await WorkoutLog.deleteOne({ _id: new mongoose.Types.ObjectId(FIXTURE_WORKOUT_LOG_ID) });
    await Exercise.deleteMany({
      _id: { $in: FIXTURE_EXERCISE_IDS.map((id) => new mongoose.Types.ObjectId(id)) },
    });
    await Exercise.deleteMany({
      name: { $in: SAMPLE_MAPPINGS.map((m) => m.curated) },
    });

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
    const log = await WorkoutLog.findById(FIXTURE_WORKOUT_LOG_ID).populate(
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
    for (const { legacy, curated } of SAMPLE_MAPPINGS) {
      const match = await Exercise.findOne({
        $or: [{ name: curated }, { aliases: legacy.toLowerCase() }],
      });
      expect(match).toBeDefined();
      expect(match?.name).toBe(curated);
      expect((match?.aliases || []).map((a) => a.toLowerCase())).toContain(legacy.toLowerCase());
    }
  });
});
