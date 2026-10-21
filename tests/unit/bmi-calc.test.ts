import { describe, expect, it } from "vitest";
import {
  calculateBmr,
  calculateSpectrumPercentage,
  calculateHistoryDelta,
  formatChartData,
} from "@/features/bmi/lib/calculations";

describe("BMI Feature Calculations", () => {
  it("calculates BMR according to Mifflin-St Jeor formula", () => {
    // weight=75kg, height=175cm -> 10*75 + 6.25*175 - 5*26 + 5 = 750 + 1093.75 - 130 + 5 = 1718.75 -> 1719
    const bmr = calculateBmr(75, 175);
    expect(bmr).toBe(1719);
  });

  it("calculates WHO spectrum percentage between 15 and 35", () => {
    expect(calculateSpectrumPercentage(15)).toBe(0);
    expect(calculateSpectrumPercentage(25)).toBe(50);
    expect(calculateSpectrumPercentage(35)).toBe(100);
    expect(calculateSpectrumPercentage(40)).toBe(100);
    expect(calculateSpectrumPercentage(10)).toBe(0);
  });

  it("computes history delta between earliest and latest entries", () => {
    const points = [
      { date: "Oct 1", bmi: 24.0, weight: 75.0, height: 175, category: "normal" },
      { date: "Oct 15", bmi: 23.5, weight: 73.5, height: 175, category: "normal" },
    ];
    const delta = calculateHistoryDelta(points);
    expect(delta).not.toBeNull();
    expect(delta?.weightDiff).toBe(-1.5);
    expect(delta?.bmiDiff).toBe(-0.5);
    expect(delta?.isWeightGain).toBe(false);
  });

  it("formats chart data reversely from history", () => {
    const history = [
      { bmi: 23.5, weight: 73.5, height: 175, category: "normal", date: "2026-10-15T00:00:00Z" },
      { bmi: 24.0, weight: 75.0, height: 175, category: "normal", date: "2026-10-01T00:00:00Z" },
    ];
    const formatted = formatChartData(history);
    expect(formatted.length).toBe(2);
    expect(formatted[0].weight).toBe(75.0);
    expect(formatted[1].weight).toBe(73.5);
  });
});
