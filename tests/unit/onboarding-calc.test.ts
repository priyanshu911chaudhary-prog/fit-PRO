import { describe, it, expect } from "vitest";
import {
  calculateAge,
  calculateBMI,
  calculateBMR,
  calculateTDEE,
} from "@/lib/fitness-calc";
import { STEPS, GOAL_OPTIONS, ACTIVITY_OPTIONS } from "@/features/onboarding/lib/constants";

describe("Onboarding configuration & calculations", () => {
  it("has exactly 4 connected steps", () => {
    expect(STEPS).toHaveLength(4);
    expect(STEPS.map((s) => s.number)).toEqual([1, 2, 3, 4]);
  });

  it("provides comprehensive goals and activity options", () => {
    expect(GOAL_OPTIONS.length).toBeGreaterThanOrEqual(5);
    expect(ACTIVITY_OPTIONS.length).toBe(5);
  });

  it("calculates accurate baseline metrics from form parameters", () => {
    const age = calculateAge("1998-05-15");
    expect(age).toBeGreaterThan(20);

    const bmiInfo = calculateBMI(75, 178);
    expect(bmiInfo.bmi).toBe(23.7);
    expect(bmiInfo.category).toBe("normal");

    const bmr = calculateBMR(75, 178, age, "male");
    expect(bmr).toBeGreaterThan(1500);

    const tdee = calculateTDEE(bmr, "moderately_active");
    expect(tdee).toBe(Math.round(bmr * 1.55));
  });
});
