import { describe, it, expect } from "vitest";
import {
  computeBmi,
  computeBmiCategory,
  computeBmr,
  computeTdee,
} from "@/features/home/lib/calculations";

describe("Home biometrics calculations", () => {
  it("computes BMI and category accurately", () => {
    const bmi = computeBmi(74, 178);
    expect(bmi).toBe(23.4);
    expect(computeBmiCategory(bmi)).toBe("Optimal");

    expect(computeBmiCategory(17.5)).toBe("Underweight");
    expect(computeBmiCategory(27.0)).toBe("Overweight");
    expect(computeBmiCategory(32.0)).toBe("Obese");
  });

  it("computes estimated BMR and TDEE using Mifflin-St Jeor formula", () => {
    // Math.round(10 * 74 + 6.25 * 178 - 5 * 26 + 5) = 740 + 1112.5 - 130 + 5 = 1727.5 -> 1728
    const bmr = computeBmr(74, 178, 26);
    expect(bmr).toBe(1728);

    // Math.round(1728 * 1.55) = 2678
    const tdee = computeTdee(bmr, 1.55);
    expect(tdee).toBe(2678);
  });
});
