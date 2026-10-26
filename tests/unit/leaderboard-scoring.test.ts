import { describe, it, expect } from "vitest";
import {
  calculateWeeklyFitScore,
  isQualifyingWorkout,
  WORKOUT_WEIGHT,
  PROTEIN_WEIGHT,
  HYDRATION_WEIGHT,
} from "@/lib/leaderboard/scoring";
import { LeaderboardTargets } from "@/lib/leaderboard/types";
import mongoose from "mongoose";

describe("Leaderboard Scoring Engine (Unit Tests)", () => {
  const defaultTargets: LeaderboardTargets = {
    weeklyWorkoutGoal: 3,
    dailyProteinTarget: 100,
    dailyHydrationTarget: 2000,
  };

  const sampleDays = [
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ];

  it("calculates 0 score when no activity exists", () => {
    const breakdown = calculateWeeklyFitScore(
      {
        scoringDays: sampleDays,
        qualifyingWorkoutsCount: 0,
        dailyProtein: {},
        dailyWater: {},
        activeDays: new Set(),
      },
      defaultTargets
    );

    expect(breakdown.weeklyFitScore).toBe(0);
    expect(breakdown.scoreBasisPoints).toBe(0);
    expect(breakdown.displayScore).toBe(0);
    expect(breakdown.isEligible).toBe(false);
    expect(breakdown.trackedDaysCount).toBe(0);
    expect(breakdown.ineligibilityReason).toContain("0/4");
  });

  it("calculates exact 100 score for full attainment across all 7 days", () => {
    const dailyProtein: Record<string, number> = {};
    const dailyWater: Record<string, number> = {};
    sampleDays.forEach((day) => {
      dailyProtein[day] = 100; // 100%
      dailyWater[day] = 2000; // 100%
    });

    const breakdown = calculateWeeklyFitScore(
      {
        scoringDays: sampleDays,
        qualifyingWorkoutsCount: 3, // exactly 3/3 workouts
        dailyProtein,
        dailyWater,
        activeDays: new Set(sampleDays),
      },
      defaultTargets
    );

    expect(breakdown.workoutComponentScore).toBe(40);
    expect(breakdown.proteinComponentScore).toBe(30);
    expect(breakdown.hydrationComponentScore).toBe(30);
    expect(breakdown.weeklyFitScore).toBe(100);
    expect(breakdown.scoreBasisPoints).toBe(10000);
    expect(breakdown.displayScore).toBe(100);
    expect(breakdown.isEligible).toBe(true);
    expect(breakdown.ineligibilityReason).toBeUndefined();
  });

  it("caps each component at 100% when targets are exceeded", () => {
    const dailyProtein: Record<string, number> = {};
    const dailyWater: Record<string, number> = {};
    sampleDays.forEach((day) => {
      dailyProtein[day] = 250; // 250% of target
      dailyWater[day] = 5000; // 250% of target
    });

    const breakdown = calculateWeeklyFitScore(
      {
        scoringDays: sampleDays,
        qualifyingWorkoutsCount: 7, // 7 out of 3 goal
        dailyProtein,
        dailyWater,
        activeDays: new Set(sampleDays),
      },
      defaultTargets
    );

    // Caps must hold strictly at 40, 30, 30
    expect(breakdown.workoutAttainment).toBe(1.0);
    expect(breakdown.workoutComponentScore).toBe(40);
    expect(breakdown.proteinAttainment).toBe(1.0);
    expect(breakdown.proteinComponentScore).toBe(30);
    expect(breakdown.hydrationAttainment).toBe(1.0);
    expect(breakdown.hydrationComponentScore).toBe(30);
    expect(breakdown.weeklyFitScore).toBe(100);
    expect(breakdown.scoreBasisPoints).toBe(10000);
  });

  it("calculates partial adherence accurately and includes all 7 days in denominator", () => {
    // Only 3 days logged full targets, other 4 days are 0
    const dailyProtein: Record<string, number> = {
      "2026-10-26": 100,
      "2026-10-27": 100,
      "2026-10-28": 100,
    };
    const dailyWater: Record<string, number> = {
      "2026-10-26": 2000,
      "2026-10-27": 2000,
      "2026-10-28": 2000,
    };

    const breakdown = calculateWeeklyFitScore(
      {
        scoringDays: sampleDays,
        qualifyingWorkoutsCount: 1, // 1 of 3 workouts = 33.33% of 40 = 13.33 pts
        dailyProtein,
        dailyWater,
        activeDays: new Set(["2026-10-26", "2026-10-27", "2026-10-28"]),
      },
      defaultTargets
    );

    // Protein: 3 days of 1.0 + 4 days of 0.0 = 3/7 = ~0.4286 * 30 = 12.86 pts
    // Hydration: 3/7 = ~0.4286 * 30 = 12.86 pts
    // Workout: 1/3 = ~0.3333 * 40 = 13.33 pts
    // Total: ~39.05 pts = 3905 basis points
    expect(breakdown.proteinAttainment).toBeCloseTo(3 / 7, 3);
    expect(breakdown.hydrationAttainment).toBeCloseTo(3 / 7, 3);
    expect(breakdown.workoutAttainment).toBeCloseTo(1 / 3, 3);
    expect(breakdown.scoreBasisPoints).toBeGreaterThan(3800);
    expect(breakdown.scoreBasisPoints).toBeLessThan(4000);

    // 3 active days is < 4 minimum tracked days -> ineligible!
    expect(breakdown.isEligible).toBe(false);
    expect(breakdown.trackedDaysCount).toBe(3);
  });

  it("enforces the 4-day minimum tracked days eligibility rule", () => {
    // 4 active days -> eligible
    const breakdown4 = calculateWeeklyFitScore(
      {
        scoringDays: sampleDays,
        qualifyingWorkoutsCount: 2,
        dailyProtein: { "2026-10-26": 50, "2026-10-27": 50, "2026-10-28": 50, "2026-10-29": 50 },
        dailyWater: {},
        activeDays: new Set(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"]),
      },
      defaultTargets
    );
    expect(breakdown4.trackedDaysCount).toBe(4);
    expect(breakdown4.isEligible).toBe(true);
    expect(breakdown4.ineligibilityReason).toBeUndefined();

    // 3 active days -> ineligible
    const breakdown3 = calculateWeeklyFitScore(
      {
        scoringDays: sampleDays,
        qualifyingWorkoutsCount: 2,
        dailyProtein: { "2026-10-26": 50, "2026-10-27": 50, "2026-10-28": 50 },
        dailyWater: {},
        activeDays: new Set(["2026-10-26", "2026-10-27", "2026-10-28"]),
      },
      defaultTargets
    );
    expect(breakdown3.trackedDaysCount).toBe(3);
    expect(breakdown3.isEligible).toBe(false);
    expect(breakdown3.ineligibilityReason).toBe("Requires activity on at least 4 distinct days this week (currently 3/4)");
  });

  describe("isQualifyingWorkout", () => {
    const validExercise = {
      exerciseId: new mongoose.Types.ObjectId(),
      sets: 3,
      reps: 10,
    };

    it("accepts a workout meeting all minimum thresholds", () => {
      expect(
        isQualifyingWorkout({
          totalDuration: 30,
          completionPercentage: 80,
          exercises: [validExercise],
        })
      ).toBe(true);
    });

    it("rejects workout with duration < 15 minutes", () => {
      expect(
        isQualifyingWorkout({
          totalDuration: 10,
          completionPercentage: 100,
          exercises: [validExercise],
        })
      ).toBe(false);
    });

    it("rejects workout with completionPercentage < 70%", () => {
      expect(
        isQualifyingWorkout({
          totalDuration: 45,
          completionPercentage: 65,
          exercises: [validExercise],
        })
      ).toBe(false);
    });

    it("rejects workout with 0 exercises", () => {
      expect(
        isQualifyingWorkout({
          totalDuration: 45,
          completionPercentage: 100,
          exercises: [],
        })
      ).toBe(false);
    });
  });
});
