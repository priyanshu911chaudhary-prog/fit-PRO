import { describe, expect, it } from "vitest";
import {
  calculateVolumeTonnage,
  calculateTotalSets,
  calculateEstimatedCaloriesBurn,
  estimateOneRepMax,
  aggregateDailyWorkoutMetrics,
} from "@/features/workout/lib/calculations";
import type { WorkoutLogRecord, WorkoutExerciseEntry } from "@/features/workout/types";

describe("Workout Telemetry Calculations", () => {
  it("calculates cumulative tonnage across exercises and sets", () => {
    const exercises: WorkoutExerciseEntry[] = [
      {
        exerciseId: "1",
        name: "Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weight: 100 },
          { setNumber: 2, reps: 8, weight: 100 },
        ],
      },
      {
        exerciseId: "2",
        name: "Incline Dumbbell Press",
        sets: [{ setNumber: 1, reps: 10, weight: 30 }],
      },
    ];
    // Bench: 10*100 + 8*100 = 1800. Incline: 10*30 = 300. Total = 2100.
    const tonnage = calculateVolumeTonnage(exercises);
    expect(tonnage).toBe(2100);
  });

  it("calculates total sets count", () => {
    const exercises: WorkoutExerciseEntry[] = [
      {
        exerciseId: "1",
        name: "Squat",
        sets: [
          { setNumber: 1, reps: 5, weight: 140 },
          { setNumber: 2, reps: 5, weight: 140 },
          { setNumber: 3, reps: 5, weight: 140 },
        ],
      },
    ];
    expect(calculateTotalSets(exercises)).toBe(3);
  });

  it("calculates estimated calories burn from duration and volume tonnage", () => {
    // duration=50 mins, volume=2400 kg -> 50*6 + Math.round(2400/120) = 300 + 20 = 320
    const burn = calculateEstimatedCaloriesBurn(50, 2400);
    expect(burn).toBe(320);
  });

  it("returns 0 calories burn for 0 duration and 0 volume", () => {
    expect(calculateEstimatedCaloriesBurn(0, 0)).toBe(0);
  });

  it("estimates 1RM using Epley formula", () => {
    // weight=100kg, reps=10 -> 100 * (1 + 10/30) = 100 * 1.333 = 133
    expect(estimateOneRepMax(100, 10)).toBe(133);
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe("Day-Level Workout Aggregation (aggregateDailyWorkoutMetrics)", () => {
  const selectedDay = "2026-10-22";

  it("returns zero metrics for an empty day with no workouts or staged items", () => {
    const result = aggregateDailyWorkoutMetrics(
      [],
      undefined,
      [],
      0,
      selectedDay,
      selectedDay
    );

    expect(result).toEqual({
      totalVolumeTonnage: 0,
      exercisesCount: 0,
      totalSetsCount: 0,
      totalDuration: 0,
      estimatedCaloriesBurn: 0,
    });
  });

  it("aggregates across multiple distinct exercises in a staged workout", () => {
    const staged: WorkoutExerciseEntry[] = [
      {
        exerciseId: "ex_bench",
        name: "Barbell Bench Press",
        sets: [
          { setNumber: 1, reps: 10, weight: 80 },
          { setNumber: 2, reps: 8, weight: 80 },
        ],
      },
      {
        exerciseId: "ex_fly",
        name: "Incline Dumbbell Fly",
        sets: [
          { setNumber: 1, reps: 12, weight: 15 },
          { setNumber: 2, reps: 12, weight: 15 },
        ],
      },
    ];

    // Bench: (10*80) + (8*80) = 800 + 640 = 1440 kg
    // Fly: (12*15) + (12*15) = 180 + 180 = 360 kg
    // Total Volume = 1800 kg. Total Sets = 4. Distinct Exercises = 2.
    // Duration: 40 mins -> Calories: 40*6 + Math.round(1800/120) = 240 + 15 = 255 kcal.
    const result = aggregateDailyWorkoutMetrics(
      [],
      undefined,
      staged,
      40,
      selectedDay,
      selectedDay
    );

    expect(result.totalVolumeTonnage).toBe(1800);
    expect(result.totalSetsCount).toBe(4);
    expect(result.exercisesCount).toBe(2);
    expect(result.totalDuration).toBe(40);
    expect(result.estimatedCaloriesBurn).toBe(255);
  });

  it("combines persisted day workouts with staged draft exercises without double counting", () => {
    const persistedLog: WorkoutLogRecord = {
      _id: "log_morning",
      title: "Morning Chest Session",
      totalDuration: 45,
      date: selectedDay,
      createdAt: `${selectedDay}T08:00:00Z`,
      exercises: [
        {
          exerciseId: {
            _id: "ex_bench",
            name: "Barbell Bench Press",
            targetMuscle: "chest",
            category: "strength",
            equipment: "barbell",
          },
          sets: 3,
          reps: 10,
          weight: 70, // 3 * 10 * 70 = 2100 kg
        },
      ],
    };

    const persistedTotals = {
      totalVolumeTonnage: 2100,
      exercisesCount: 1,
      totalSetsCount: 3,
      totalDuration: 45,
      estimatedCaloriesBurn: 288,
    };

    // Staged afternoon session with 1 new exercise and 1 repeat exercise
    const staged: WorkoutExerciseEntry[] = [
      {
        exerciseId: "ex_bench", // Same exercise as morning
        name: "Barbell Bench Press",
        sets: [{ setNumber: 1, reps: 5, weight: 90 }], // 450 kg, 1 set
      },
      {
        exerciseId: "ex_triceps", // New distinct movement
        name: "Tricep Pushdown",
        sets: [
          { setNumber: 1, reps: 15, weight: 20 },
          { setNumber: 2, reps: 15, weight: 20 },
        ], // 600 kg, 2 sets
      },
    ];

    const result = aggregateDailyWorkoutMetrics(
      [persistedLog],
      persistedTotals,
      staged,
      30,
      selectedDay,
      selectedDay
    );

    // Total Volume = 2100 (morning) + 450 + 600 = 3150 kg
    // Total Sets = 3 (morning) + 1 + 2 = 6 sets
    // Distinct exercises = "ex_bench" + "ex_triceps" = 2 distinct exercises (not 3!)
    // Total Duration = 45 + 30 = 75 mins
    expect(result.totalVolumeTonnage).toBe(3150);
    expect(result.totalSetsCount).toBe(6);
    expect(result.exercisesCount).toBe(2);
    expect(result.totalDuration).toBe(75);
    // Calories: 75 * 6 + Math.round(3150 / 120) = 450 + 26 = 476 kcal
    expect(result.estimatedCaloriesBurn).toBe(476);
  });

  it("isolates day totals and does not leak staged draft into another date", () => {
    const staged: WorkoutExerciseEntry[] = [
      {
        exerciseId: "ex_deadlift",
        name: "Deadlift",
        sets: [{ setNumber: 1, reps: 5, weight: 150 }],
      },
    ];

    // Staged for selectedDay (2026-10-22), but user is viewing yesterday (2026-10-21)
    const yesterday = "2026-10-21";
    const result = aggregateDailyWorkoutMetrics(
      [],
      undefined,
      staged,
      45,
      selectedDay, // staged on 2026-10-22
      yesterday    // viewing 2026-10-21
    );

    // Yesterday's view must be completely isolated (0 tonnage, 0 sets)
    expect(result.totalVolumeTonnage).toBe(0);
    expect(result.totalSetsCount).toBe(0);
    expect(result.exercisesCount).toBe(0);
    expect(result.totalDuration).toBe(0);
    expect(result.estimatedCaloriesBurn).toBe(0);
  });

  it("handles empty or invalid sets without polluting total volume or sets count", () => {
    const staged: WorkoutExerciseEntry[] = [
      {
        exerciseId: "ex_squat",
        name: "Bodyweight Squat",
        sets: [
          { setNumber: 1, reps: 15, weight: 0 }, // Bodyweight: 15 reps, 0 kg load
          { setNumber: 2, reps: 0, weight: 50 }, // Invalid/uncompleted: 0 reps
        ],
      },
    ];

    const result = aggregateDailyWorkoutMetrics(
      [],
      undefined,
      staged,
      20,
      selectedDay,
      selectedDay
    );

    // Set 1 (15 reps @ 0kg): volume = 0, valid set = +1
    // Set 2 (0 reps): invalid/empty, not counted
    expect(result.totalVolumeTonnage).toBe(0);
    expect(result.totalSetsCount).toBe(1);
    expect(result.exercisesCount).toBe(1);
  });

  it("updates totals immediately when a set is edited or added", () => {
    const initialStaged: WorkoutExerciseEntry[] = [
      {
        exerciseId: "ex_curl",
        name: "Bicep Curl",
        sets: [{ setNumber: 1, reps: 10, weight: 15 }], // 150 kg
      },
    ];

    const initial = aggregateDailyWorkoutMetrics(
      [],
      undefined,
      initialStaged,
      15,
      selectedDay,
      selectedDay
    );
    expect(initial.totalVolumeTonnage).toBe(150);
    expect(initial.totalSetsCount).toBe(1);

    // Edit reps from 10 to 12
    const editedStaged: WorkoutExerciseEntry[] = [
      {
        exerciseId: "ex_curl",
        name: "Bicep Curl",
        sets: [{ setNumber: 1, reps: 12, weight: 15 }], // 180 kg
      },
    ];
    const edited = aggregateDailyWorkoutMetrics(
      [],
      undefined,
      editedStaged,
      15,
      selectedDay,
      selectedDay
    );
    expect(edited.totalVolumeTonnage).toBe(180);

    // Add a second set (10 reps @ 17.5kg -> +175 kg)
    const addedSetStaged: WorkoutExerciseEntry[] = [
      {
        exerciseId: "ex_curl",
        name: "Bicep Curl",
        sets: [
          { setNumber: 1, reps: 12, weight: 15 },
          { setNumber: 2, reps: 10, weight: 17.5 },
        ], // 180 + 175 = 355 kg
      },
    ];
    const withAddedSet = aggregateDailyWorkoutMetrics(
      [],
      undefined,
      addedSetStaged,
      15,
      selectedDay,
      selectedDay
    );
    expect(withAddedSet.totalVolumeTonnage).toBe(355);
    expect(withAddedSet.totalSetsCount).toBe(2);
  });
});
