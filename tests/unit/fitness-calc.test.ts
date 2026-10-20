import { describe, expect, it } from "vitest";
import { UserGenderEnum, UserWeightPreferenceEnum } from "@/constants";
import {
  calculateAge,
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  getFitnessMetrics,
} from "@/lib/fitness-calc";

describe("Showcase: Unit Tests -> Fitness Calculations Engine", () => {
  describe("Age Computation (Calendar math & Leap years)", () => {
    it("calculates exact chronological age", () => {
      const now = new Date();
      const birthDate = new Date(now.getFullYear() - 25, now.getMonth(), now.getDate() - 1);
      expect(calculateAge(birthDate)).toBe(25);
    });

    it("handles birthdays not yet reached in the calendar year", () => {
      const now = new Date();
      const birthDate = new Date(now.getFullYear() - 25, now.getMonth() + 1, now.getDate());
      expect(calculateAge(birthDate)).toBe(24);
    });

    it("returns default age fallback for invalid date strings", () => {
      expect(calculateAge("invalid-date-format")).toBe(25);
    });
  });

  describe("BMI & Classification Boundaries", () => {
    it("classifies Underweight (BMI < 18.5)", () => {
      const res = calculateBMI(50, 180); // BMI ~ 15.4
      expect(res.category).toBe(UserWeightPreferenceEnum.UNDERWEIGHT);
      expect(res.bmi).toBe(15.4);
    });

    it("classifies Normal weight (18.5 <= BMI < 25.0)", () => {
      const res = calculateBMI(70, 175); // BMI ~ 22.9
      expect(res.category).toBe(UserWeightPreferenceEnum.NORMAL);
      expect(res.bmi).toBe(22.9);
    });

    it("classifies Overweight (25.0 <= BMI < 30.0)", () => {
      const res = calculateBMI(80, 170); // BMI ~ 27.7
      expect(res.category).toBe(UserWeightPreferenceEnum.OVERWEIGHT);
      expect(res.bmi).toBe(27.7);
    });

    it("classifies Obese (BMI >= 30.0)", () => {
      const res = calculateBMI(110, 175); // BMI ~ 35.9
      expect(res.category).toBe(UserWeightPreferenceEnum.OBESE);
      expect(res.bmi).toBe(35.9);
    });

    it("throws clear error for zero or negative dimensions", () => {
      expect(() => calculateBMI(0, 175)).toThrow("Height and weight must be greater than zero");
      expect(() => calculateBMI(70, 0)).toThrow("Height and weight must be greater than zero");
      expect(() => calculateBMI(-10, 175)).toThrow("Height and weight must be greater than zero");
    });
  });

  describe("Basal Metabolic Rate (Mifflin-St Jeor Formula)", () => {
    it("calculates BMR for male (+5 offset)", () => {
      // 10*70 + 6.25*175 - 5*25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75 ~ 1674
      const bmr = calculateBMR(70, 175, 25, UserGenderEnum.MALE);
      expect(bmr).toBe(1674);
    });

    it("calculates BMR for female (-161 offset)", () => {
      // 10*60 + 6.25*165 - 5*30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 ~ 1320
      const bmr = calculateBMR(60, 165, 30, UserGenderEnum.FEMALE);
      expect(bmr).toBe(1320);
    });
  });

  describe("Total Daily Energy Expenditure (TDEE Activity Multipliers)", () => {
    it("applies sedentary multiplier (1.2x)", () => {
      expect(calculateTDEE(1500, "sedentary")).toBe(1800);
    });

    it("applies moderately active multiplier (1.55x)", () => {
      expect(calculateTDEE(1500, "moderately_active")).toBe(2325);
    });

    it("applies very active multiplier (1.725x)", () => {
      expect(calculateTDEE(1500, "very_active")).toBe(2588);
    });
  });

  describe("Aggregated Profile Metrics", () => {
    it("computes complete biometric snapshot", () => {
      const profile = {
        weight: 75,
        height: 180,
        age: 28,
        gender: UserGenderEnum.MALE,
        activityLevel: "moderately_active",
      };
      const metrics = getFitnessMetrics(profile);
      expect(metrics.bmi).toBe(23.1);
      expect(metrics.bmiCategory).toBe(UserWeightPreferenceEnum.NORMAL);
      expect(metrics.bmr).toBeGreaterThan(1600);
      expect(metrics.tdee).toBeGreaterThan(metrics.bmr);
      expect(metrics.age).toBe(28);
    });
  });
});
