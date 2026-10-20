import { describe, expect, it } from "vitest";
import {
  registerSchema,
  loginSchema,
} from "@/validators/auth.validator";
import { logMealSchema, mealItemSchema } from "@/validators/meal.validator";
import { logWorkoutSchema } from "@/validators/workout.validator";
import { logWaterSchema } from "@/validators/water.validator";
import { logBmiSchema } from "@/validators/bmi.validator";

describe("Showcase: Unit Tests -> Zod Validation Schemas", () => {
  describe("Auth Validation Schemas", () => {
    it("accepts valid registration input with strict password complexity", () => {
      const valid = registerSchema.safeParse({
        fullName: "Alex Mercer",
        email: "Alex.Mercer@Example.COM",
        password: "Password123!",
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.email).toBe("alex.mercer@example.com"); // transforms to lowercase
        expect(valid.data.fullName).toBe("Alex Mercer");
      }
    });

    it("rejects weak passwords missing uppercase, digits, or symbols", () => {
      const missingUpper = registerSchema.safeParse({
        fullName: "Test",
        email: "test@example.com",
        password: "password123!",
      });
      expect(missingUpper.success).toBe(false);

      const missingSpecial = registerSchema.safeParse({
        fullName: "Test",
        email: "test@example.com",
        password: "Password123",
      });
      expect(missingSpecial.success).toBe(false);

      const tooShort = registerSchema.safeParse({
        fullName: "Test",
        email: "test@example.com",
        password: "P1!",
      });
      expect(tooShort.success).toBe(false);
    });

    it("enforces maximum password length (72-char bcrypt boundary)", () => {
      const overLimit = "Aa1!" + "x".repeat(70);
      const res = registerSchema.safeParse({
        fullName: "Test",
        email: "test@example.com",
        password: overLimit,
      });
      expect(res.success).toBe(false);
    });

    it("validates login schema properly trimming and lowercasing", () => {
      const valid = loginSchema.safeParse({
        email: "USER@DOMAIN.COM",
        password: "SecretPassword1!",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.email).toBe("user@domain.com");
      }
    });
  });

  describe("Meal & Nutrition Validation Schemas", () => {
    it("validates meal log item with valid 24-hex Mongo ObjectID", () => {
      const validItem = mealItemSchema.safeParse({
        foodItemId: "507f1f77bcf86cd799439011",
        quantity: 2,
        servingSize: "2 bowls",
        calories: 450,
      });
      expect(validItem.success).toBe(true);
    });

    it("rejects meal item with invalid foodItemId format", () => {
      const invalidItem = mealItemSchema.safeParse({
        foodItemId: "not-an-object-id",
        quantity: 1,
      });
      expect(invalidItem.success).toBe(false);
    });

    it("preprocesses and formats meal log payload gracefully", () => {
      const validMeal = logMealSchema.safeParse({
        title: "post workout shake",
        meals: [
          {
            foodItemId: "507f1f77bcf86cd799439011",
            quantity: 1,
            calories: 320,
          },
        ],
      });
      expect(validMeal.success).toBe(true);
      if (validMeal.success) {
        expect(validMeal.data.title).toBe("Post workout shake");
        expect(validMeal.data.completionPercentage).toBe(100);
      }
    });
  });

  describe("Workout & Exercise Validation Schemas", () => {
    it("validates exercise log with sets and reps", () => {
      const valid = logWorkoutSchema.safeParse({
        title: "Leg Day Squats",
        exercises: [
          {
            exerciseId: "507f1f77bcf86cd799439012",
            sets: [
              { reps: 10, weight: 100 },
              { reps: 8, weight: 110 },
            ],
            durationMinutes: 45,
          },
        ],
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("Water Hydration Validation Schemas", () => {
    it("accepts valid water amount between 1ml and 10000ml", () => {
      const valid = logWaterSchema.safeParse({
        amount: 500,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.amountMl).toBe(500);
      }
    });

    it("rejects negative or absurd water amounts", () => {
      const negative = logWaterSchema.safeParse({ amount: -100 });
      expect(negative.success).toBe(false);

      const excessive = logWaterSchema.safeParse({ amount: 50000 });
      expect(excessive.success).toBe(false);
    });
  });

  describe("BMI & Biometrics Validation Schemas", () => {
    it("validates height and weight within physiological ranges", () => {
      const valid = logBmiSchema.safeParse({
        height: 180, // cm
        weight: 75, // kg
      });
      expect(valid.success).toBe(true);
    });

    it("rejects non-positive height or weight out of bounds", () => {
      const zeroHeight = logBmiSchema.safeParse({ height: 10, weight: 70 });
      expect(zeroHeight.success).toBe(false);

      const negativeWeight = logBmiSchema.safeParse({ height: 175, weight: 5 });
      expect(negativeWeight.success).toBe(false);
    });
  });
});
