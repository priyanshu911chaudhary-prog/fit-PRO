import { describe, expect, it } from "vitest";
import {
  extractPlanRecord,
  normalizeWorkoutDays,
  normalizeMealDays,
} from "@/features/plans/lib/plan-helpers";

describe("Plans Feature Helpers", () => {
  it("extracts plan record from various API response shapes", () => {
    const single = { _id: "plan-1", planName: "Hypertrophy Push Pull Legs" };
    expect(extractPlanRecord(single)?._id).toBe("plan-1");

    const wrapped = { plan: { _id: "plan-2", planName: "Endurance Split" } };
    expect(extractPlanRecord(wrapped)?._id).toBe("plan-2");

    const arrayWrapped = [{ _id: "plan-3", planName: "Full Body Protocol" }];
    expect(extractPlanRecord(arrayWrapped)?._id).toBe("plan-3");

    expect(extractPlanRecord(undefined)).toBeNull();
  });

  it("normalizes workout days with fallback values", () => {
    const plan = {
      planName: "Test Split",
      schedule: [
        {
          day: "Monday",
          exercises: [{ name: "Bench Press", sets: 4, reps: "8-10" }],
        },
      ],
    };
    const days = normalizeWorkoutDays(plan);
    expect(days.length).toBe(1);
    expect(days[0].dayName).toBe("Monday");
    expect(days[0].dayNumber).toBe(1);
    expect(days[0].focus).toBe("Targeted Training");
    expect(days[0].exercises[0].name).toBe("Bench Press");
  });

  it("normalizes meal days and computes total calories accurately", () => {
    const plan = {
      planName: "Keto Protocol",
      days: [
        {
          dayNumber: 1,
          dayName: "Day 1",
          meals: [
            { calories: 500, name: "Breakfast" },
            {
              items: [
                { name: "Chicken Breast", calories: 350 },
                { name: "Brown Rice", calories: 200 },
              ],
            },
          ],
        },
      ],
    };
    const days = normalizeMealDays(plan);
    expect(days.length).toBe(1);
    // 500 + 350 + 200 = 1050
    expect(days[0].totalCalories).toBe(1050);
  });
});
