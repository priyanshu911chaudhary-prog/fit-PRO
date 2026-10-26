import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Exercise } from "@/models/exercise";
import { FoodItem } from "@/models/foodItem";
import { GET as getExercises } from "@/app/api/exercises/route";
import { GET as getFoods } from "@/app/api/foods/route";
import { seedExercises } from "../../scripts/seed-exercises";
import { seedMeals } from "../../scripts/seed-meals";
import {
  invalidateCatalogCache,
  getCatalogVersion,
} from "@/lib/cache/redis-cache";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";

describe("Catalog Endpoints & Redis Caching (Integration Tests)", () => {
  const createdExerciseIds: mongoose.Types.ObjectId[] = [];
  const createdFoodIds: mongoose.Types.ObjectId[] = [];

  beforeAll(async () => {
    if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
      process.env.MONGODB_URI = process.env.MONGO_URI;
    }
    await connectDB();
    const redis = getRedisClient();
    await ensureRedisConnected(redis);

    // Clean up any stale test items
    await Exercise.deleteMany({ name: { $regex: /^Cached Test/ } });
    await FoodItem.deleteMany({ name: { $regex: /^Cached Test/ } });

    // Seed test exercises
    const ex1 = await Exercise.create({
      name: "Cached Test Bench Press",
      targetMuscle: "chest",
      equipment: "barbell",
      category: "strength",
      aliases: ["Flat Barbell Press", "Chest Press"],
    });
    const ex2 = await Exercise.create({
      name: "Cached Test Incline Dumbbell Press",
      targetMuscle: "chest",
      equipment: "dumbbell",
      category: "strength",
      aliases: ["Incline DB Press"],
    });
    const ex3 = await Exercise.create({
      name: "Cached Test Pull-Up",
      targetMuscle: "back",
      equipment: "bodyweight",
      category: "strength",
      aliases: ["Wide-Grip Pullup"],
    });
    createdExerciseIds.push(ex1._id as mongoose.Types.ObjectId, ex2._id as mongoose.Types.ObjectId, ex3._id as mongoose.Types.ObjectId);

    // Seed test foods (including an inactive one)
    const food1 = await FoodItem.create({
      name: "Cached Test Oatmeal",
      category: "grains",
      mealType: "breakfast",
      dietaryPreference: "vegan",
      calories: 150,
      protein: 5,
      carbs: 27,
      fat: 3,
      servingBasis: "per_serving",
      servingUnit: "bowl",
      isActive: true,
      aliases: ["Rolled Oats", "Porridge"],
    });
    const food2 = await FoodItem.create({
      name: "Cached Test Grilled Chicken",
      category: "meat",
      mealType: "lunch",
      dietaryPreference: "paleo",
      calories: 220,
      protein: 40,
      carbs: 0,
      fat: 5,
      servingBasis: "per_100g",
      servingUnit: "g",
      isActive: true,
      aliases: ["Chicken Breast"],
    });
    const foodInactive = await FoodItem.create({
      name: "Cached Test Inactive Snack",
      category: "snacks",
      mealType: "snack",
      dietaryPreference: "vegetarian",
      calories: 300,
      protein: 2,
      carbs: 40,
      fat: 15,
      servingBasis: "per_serving",
      servingUnit: "bar",
      isActive: false, // Inactive: must never be returned
      aliases: ["Old Candy Bar"],
    });
    createdFoodIds.push(
      food1._id as mongoose.Types.ObjectId,
      food2._id as mongoose.Types.ObjectId,
      foodInactive._id as mongoose.Types.ObjectId
    );

    // Invalidate initial cache so fresh test items are included
    await invalidateCatalogCache("exercises");
    await invalidateCatalogCache("foods");
  }, 30000);

  afterAll(async () => {
    if (createdExerciseIds.length > 0) {
      await Exercise.deleteMany({ _id: { $in: createdExerciseIds } });
    }
    if (createdFoodIds.length > 0) {
      await FoodItem.deleteMany({ _id: { $in: createdFoodIds } });
    }
  });

  it("exercises: cold read caches snapshot and warm read returns identical results", async () => {
    // 1. Invalidate cache to ensure cold start
    await invalidateCatalogCache("exercises");

    const reqCold = new NextRequest("http://localhost:3000/api/exercises?targetMuscle=chest");
    const resCold = await getExercises(reqCold, {});
    expect(resCold.status).toBe(200);
    const coldBody = await resCold.json();

    // 2. Warm read
    const reqWarm = new NextRequest("http://localhost:3000/api/exercises?targetMuscle=chest");
    const resWarm = await getExercises(reqWarm, {});
    expect(resWarm.status).toBe(200);
    const warmBody = await resWarm.json();

    // Verify response parity between cold and warm reads
    expect(warmBody.data.total).toBe(coldBody.data.total);
    expect(warmBody.data.exercises.length).toBe(coldBody.data.exercises.length);
    expect(warmBody.data.exercises[0].name).toBe(coldBody.data.exercises[0].name);
    expect(warmBody.data.totalPages).toBe(coldBody.data.totalPages);
  });

  it("exercises: query and alias matching work correctly on cached data", async () => {
    // Query by alias "Flat Barbell Press"
    const req = new NextRequest("http://localhost:3000/api/exercises?q=flat+barbell+press");
    const res = await getExercises(req, {});
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.total).toBeGreaterThanOrEqual(1);
    const matched = body.data.exercises.find((e: { name: string }) => e.name === "Cached Test Bench Press");
    expect(matched).toBeDefined();
    expect(matched.targetMuscle).toBe("chest");
  });

  it("exercises: sorting, muscle filter, equipment filter, pagination and totals remain correct", async () => {
    const req = new NextRequest("http://localhost:3000/api/exercises?targetMuscle=chest&equipment=dumbbell&page=1&limit=10");
    const res = await getExercises(req, {});
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.data.page).toBe(1);
    const names = body.data.exercises.map((e: { name: string }) => e.name);
    expect(names).toContain("Cached Test Incline Dumbbell Press");
    expect(names).not.toContain("Cached Test Bench Press"); // Barbell, not dumbbell
  });

  it("foods: excludes inactive items from cached results", async () => {
    const req = new NextRequest("http://localhost:3000/api/foods?q=Cached+Test");
    const res = await getFoods(req, {});
    expect(res.status).toBe(200);
    const body = await res.json();

    const names = body.data.foods.map((f: { name: string }) => f.name);
    expect(names).toContain("Cached Test Oatmeal");
    expect(names).toContain("Cached Test Grilled Chicken");
    expect(names).not.toContain("Cached Test Inactive Snack"); // Must be excluded
  });

  it("foods: mealType, category and dietaryPreference filters work accurately", async () => {
    const req = new NextRequest("http://localhost:3000/api/foods?mealType=breakfast&dietaryPreference=vegan");
    const res = await getFoods(req, {});
    expect(res.status).toBe(200);
    const body = await res.json();

    const oatmeal = body.data.foods.find((f: { name: string }) => f.name === "Cached Test Oatmeal");
    expect(oatmeal).toBeDefined();

    const chicken = body.data.foods.find((f: { name: string }) => f.name === "Cached Test Grilled Chicken");
    expect(chicken).toBeUndefined(); // Lunch, non-veg
  });

  it("catalog changes invalidate the cached snapshot via version bump", async () => {
    const vBefore = await getCatalogVersion("exercises");
    await invalidateCatalogCache("exercises");
    const vAfter = await getCatalogVersion("exercises");

    expect(vAfter).toBe(vBefore + 1);
  });

  it("dry-run catalog seeding does not mutate the cache or database", async () => {
    const vExBefore = await getCatalogVersion("exercises");
    const vFoodBefore = await getCatalogVersion("foods");

    await seedExercises({ dryRun: true });
    await seedMeals({ dryRun: true });

    const vExAfter = await getCatalogVersion("exercises");
    const vFoodAfter = await getCatalogVersion("foods");

    // Version must NOT bump on dry run
    expect(vExAfter).toBe(vExBefore);
    expect(vFoodAfter).toBe(vFoodBefore);
  });
});
