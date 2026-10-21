import { describe, it, expect } from "vitest";
import {
  formatSafeDate,
  getGreeting,
  filterChartData,
  calculateMetricDelta,
} from "@/features/dashboard/lib/dashboard-helpers";

describe("Dashboard helpers", () => {
  it("determines correct greeting based on hour", () => {
    const morning = new Date(2025, 0, 1, 9);
    const afternoon = new Date(2025, 0, 1, 14);
    const evening = new Date(2025, 0, 1, 20);

    expect(getGreeting(morning)).toBe("Good morning");
    expect(getGreeting(afternoon)).toBe("Good afternoon");
    expect(getGreeting(evening)).toBe("Good evening");
  });

  it("filters chart data according to time range", () => {
    const history = Array.from({ length: 40 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      weight: 75 + i * 0.1,
      bmi: 24,
    }));

    expect(filterChartData(history, "7d")).toHaveLength(7);
    expect(filterChartData(history, "30d")).toHaveLength(30);
    expect(filterChartData(history, "all")).toHaveLength(40);
    expect(filterChartData(undefined, "7d")).toEqual([]);
  });

  it("calculates metric delta accurately", () => {
    const history = [
      { date: "2025-01-01", weight: 80.0, bmi: 25.0 },
      { date: "2025-01-02", weight: 79.2, bmi: 24.7 },
    ];

    const delta = calculateMetricDelta(history, "weight");
    expect(delta).not.toBeNull();
    expect(delta?.diff).toBe(-0.8);
    expect(delta?.isPositive).toBe(false);
    expect(delta?.isZero).toBe(false);
    expect(delta?.unit).toBe("kg");

    const bmiDelta = calculateMetricDelta(history, "bmi");
    expect(bmiDelta?.unit).toBe("pts");

    expect(calculateMetricDelta([], "weight")).toBeNull();
  });

  it("formats date strings safely", () => {
    expect(formatSafeDate("2025-02-14")).toContain("Feb");
  });
});
