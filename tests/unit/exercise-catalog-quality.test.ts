import { describe, it, expect } from "vitest";
import { catalogExercises } from "@/lib/catalog/exercise-catalog-data";
import { AvailableEquipment, AvailableExerciseCategories, AvailableMuscleGroups } from "@/constants";

describe("Exercise Catalog Quality & Movement Taxonomy Integrity", () => {
  it("contains at least 250 genuinely distinct, curated exercise movements", () => {
    expect(catalogExercises.length).toBeGreaterThanOrEqual(250);
  });

  it("has zero duplicate exercise names (case-insensitive and trimmed)", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const ex of catalogExercises) {
      const normalized = ex.name.toLowerCase().trim();
      if (seen.has(normalized)) {
        duplicates.push(ex.name);
      }
      seen.add(normalized);
    }

    expect(duplicates).toEqual([]);
  });

  it("ensures all exercise metadata values strictly map to model constants", () => {
    for (const ex of catalogExercises) {
      expect(ex.name.trim().length).toBeGreaterThan(0);
      expect(AvailableMuscleGroups).toContain(ex.targetMuscle);
      expect(AvailableEquipment).toContain(ex.equipment);
      expect(AvailableExerciseCategories).toContain(ex.category);
      expect(Array.isArray(ex.aliases)).toBe(true);
    }
  });

  it("preserves distinct movements between barbell, dumbbell, and bodyweight variants", () => {
    const bbBench = catalogExercises.find((e) => e.name === "Barbell Bench Press");
    const dbBench = catalogExercises.find((e) => e.name === "Dumbbell Bench Press");
    const pushups = catalogExercises.find((e) => e.name === "Push-ups");

    expect(bbBench).toBeDefined();
    expect(dbBench).toBeDefined();
    expect(pushups).toBeDefined();

    expect(bbBench!.equipment).toBe("barbell");
    expect(dbBench!.equipment).toBe("dumbbell");
    expect(pushups!.equipment).toBe("bodyweight");
  });

  it("preserves distinct movements between squats and deadlifts", () => {
    const backSquats = catalogExercises.find((e) => e.name === "Barbell Back Squats");
    const frontSquats = catalogExercises.find((e) => e.name === "Barbell Front Squats");
    const rdl = catalogExercises.find((e) => e.name === "Romanian Deadlift (Barbell)");
    const deadlift = catalogExercises.find((e) => e.name === "Conventional Deadlift");

    expect(backSquats).toBeDefined();
    expect(frontSquats).toBeDefined();
    expect(rdl).toBeDefined();
    expect(deadlift).toBeDefined();

    expect(backSquats!.name).not.toBe(frontSquats!.name);
    expect(rdl!.name).not.toBe(deadlift!.name);
  });

  it("covers all primary muscle groups comprehensively", () => {
    const muscleCounts: Record<string, number> = {};
    for (const ex of catalogExercises) {
      muscleCounts[ex.targetMuscle] = (muscleCounts[ex.targetMuscle] || 0) + 1;
    }

    // Every primary muscle group must have at least 25 distinct movements
    expect(muscleCounts["chest"]).toBeGreaterThanOrEqual(25);
    expect(muscleCounts["back"]).toBeGreaterThanOrEqual(25);
    expect(muscleCounts["shoulders"]).toBeGreaterThanOrEqual(25);
    expect(muscleCounts["arms"]).toBeGreaterThanOrEqual(25);
    expect(muscleCounts["legs"]).toBeGreaterThanOrEqual(25);
    expect(muscleCounts["core"]).toBeGreaterThanOrEqual(25);
    expect(muscleCounts["full_body"]).toBeGreaterThanOrEqual(20);
  });

  it("covers cardio and flexibility categories appropriately", () => {
    const cardioExercises = catalogExercises.filter((e) => e.category === "cardio");
    const flexExercises = catalogExercises.filter((e) => e.category === "flexibility");

    expect(cardioExercises.length).toBeGreaterThanOrEqual(20);
    expect(flexExercises.length).toBeGreaterThanOrEqual(20);
  });
});
