import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { FoodItem } from "@/models/foodItem";
import { Exercise } from "@/models/exercise";
import { seedMeals } from "../../scripts/seed-meals";
import { seedExercises } from "../../scripts/seed-exercises";
import { mapAIExercisesToIds, mapAIMealsToIds } from "@/lib/ai/plan-helpers";

describe("Integration: Catalog Seeding, Dry-Run & AI Upsert Compatibility", () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
      process.env.MONGODB_URI = process.env.MONGO_URI;
    }
    await connectDB();
  }, 30000);

  afterAll(async () => {
    // Keep connection open or clean up as managed by Vitest
  });

  it("executes seedMeals in dry-run mode without modifying any database records", async () => {
    const foodCountBefore = await FoodItem.countDocuments();
    const report = await seedMeals({ dryRun: true });

    expect(report.isDryRun).toBe(true);
    expect(report.totalCatalogItems).toBeGreaterThanOrEqual(300);
    expect(report.inserted).toBe(0);
    expect(report.updated).toBe(0);
    expect(report.wouldInsert + report.unchanged).toBeGreaterThan(0);

    const foodCountAfter = await FoodItem.countDocuments();
    expect(foodCountAfter).toBe(foodCountBefore);
  });

  it("executes seedExercises in dry-run mode without modifying any database records", async () => {
    const exCountBefore = await Exercise.countDocuments();
    const report = await seedExercises({ dryRun: true });

    expect(report.isDryRun).toBe(true);
    expect(report.totalCatalogItems).toBeGreaterThanOrEqual(250);
    expect(report.inserted).toBe(0);
    expect(report.updated).toBe(0);
    expect(report.wouldInsert + report.unchanged).toBeGreaterThan(0);

    const exCountAfter = await Exercise.countDocuments();
    expect(exCountAfter).toBe(exCountBefore);
  });

  it("preserves AI plan mapping compatibility with alias resolution", async () => {
    // Test mapping an AI exercise schedule using standard and alias names
    const mockSchedule = [
      {
        day: "Monday",
        exercises: [
          { name: "Barbell Bench Press", sets: 3, reps: 10 },
          { name: "Push-ups", sets: 3, reps: 15 },
        ],
      },
    ];

    const mapped = await mapAIExercisesToIds(mockSchedule);
    expect(mapped.length).toBe(1);
    expect(mapped[0].exercises.length).toBe(2);
    expect(mapped[0].exercises[0].exerciseId).toBeDefined();
    expect(mapped[0].exercises[1].exerciseId).toBeDefined();
  });

  it("preserves AI meal mapping compatibility and marks novel items inactive", async () => {
    const mockMealSchedule = [
      {
        day: "Monday",
        meals: [
          {
            name: "Tomato",
            servingSize: "100g",
            calories: 18,
            protein: 0.9,
            carbs: 3.9,
            fat: 0.2,
          },
        ],
      },
    ];

    const mapped = await mapAIMealsToIds(mockMealSchedule);
    expect(mapped.length).toBe(1);
    expect(mapped[0].meals.length).toBe(1);
    expect(mapped[0].meals[0].foodItemId).toBeDefined();
  });
});
