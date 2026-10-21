import { describe, expect, it } from "vitest";
import {
  calculateVolumeTonnage,
  calculateTotalSets,
  calculateEstimatedCaloriesBurn,
  estimateOneRepMax,
} from "@/features/workout/lib/calculations";

describe("Workout Telemetry Calculations", () => {
  it("calculates cumulative tonnage across exercises and sets", () => {
    const exercises = [
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
    const exercises = [
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

  it("estimates 1RM using Epley formula", () => {
    // weight=100kg, reps=10 -> 100 * (1 + 10/30) = 100 * 1.333 = 133
    expect(estimateOneRepMax(100, 10)).toBe(133);
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});
