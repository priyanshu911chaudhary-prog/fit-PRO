import { describe, expect, it } from "vitest";
import { calculateHydrationStats, CIRCUMFERENCE } from "@/features/water/lib/calculations";

describe("Water Calculations", () => {
  it("calculates percentage and remaining fluid correctly", () => {
    const stats = calculateHydrationStats(1500, 3000);
    expect(stats.total).toBe(1500);
    expect(stats.target).toBe(3000);
    expect(stats.percentage).toBe(50);
    expect(stats.remaining).toBe(1500);
    expect(stats.glasses).toBe(6);
    expect(stats.circumference).toBeCloseTo(CIRCUMFERENCE);
  });

  it("caps percentage at 100 when intake exceeds target", () => {
    const stats = calculateHydrationStats(3500, 3000);
    expect(stats.percentage).toBe(100);
    expect(stats.remaining).toBe(0);
    expect(stats.strokeDashoffset).toBe(0);
  });

  it("handles zero or undefined amounts gracefully", () => {
    const stats = calculateHydrationStats(0, 3000);
    expect(stats.total).toBe(0);
    expect(stats.percentage).toBe(0);
    expect(stats.remaining).toBe(3000);
    expect(stats.glasses).toBe(0);
    expect(stats.strokeDashoffset).toBe(CIRCUMFERENCE);
  });
});
