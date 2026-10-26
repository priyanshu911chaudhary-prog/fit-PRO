import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";
import { Exercise } from "@/models/exercise";
import { FoodItem } from "@/models/foodItem";
import { WorkoutLog } from "@/models/workoutLog";
import { MealLog } from "@/models/mealLog";
import { WaterLog } from "@/models/waterLog";
import { Bmi } from "@/models/bmi";
import { signAccessToken } from "@/lib/auth/jwt";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";
import { getDashboardVersion, invalidateDashboardCache } from "@/lib/cache/redis-cache";

import { GET as getDashboardHandler } from "@/app/api/dashboard/stats/route";
import { POST as createWorkoutHandler } from "@/app/api/workout/route";
import { DELETE as deleteWorkoutHandler } from "@/app/api/workout/[id]/route";
import { POST as createMealHandler } from "@/app/api/meal/route";
import { DELETE as deleteMealHandler } from "@/app/api/meal/[id]/route";
import { POST as createWaterHandler } from "@/app/api/water/route";
import { DELETE as deleteWaterHandler } from "@/app/api/water/[id]/route";
import { POST as createProfileHandler, PATCH as patchProfileHandler } from "@/app/api/profile/route";
import { POST as createBmiHandler } from "@/app/api/bmi/route";

describe("Dashboard Endpoint & Redis Caching (Integration Tests)", () => {
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let testExerciseId: string;
  let testFoodId: string;

  beforeAll(async () => {
    if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
      process.env.MONGODB_URI = process.env.MONGO_URI;
    }
    await connectDB();
    const redis = getRedisClient();
    await ensureRedisConnected(redis);

    const testTs = Date.now();

    // Clean up any stale test records from previous runs
    await User.deleteMany({ email: { $regex: /@dash-cache-test\.com$/ } });

    // Create User A
    const uA = await User.create({
      fullName: "Dashboard Tester A",
      email: `user_a_${testTs}@dash-cache-test.com`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenA = await signAccessToken({ userId: uA._id.toString(), email: uA.email });
    userA = { id: uA._id.toString(), email: uA.email, token: tokenA };

    // Create Profile A
    await Profile.create({
      user: uA._id,
      gender: "male",
      dob: new Date("1995-05-15"),
      height: 180,
      weight: 78,
      fitnessGoal: "muscle_building",
      activityLevel: "moderately_active",
      dietaryPreference: "none",
      experienceLevel: "intermediate",
      equipmentAvailable: ["barbell", "dumbbell"],
      isProfileComplete: true,
    });

    // Create User B
    const uB = await User.create({
      fullName: "Dashboard Tester B",
      email: `user_b_${testTs}@dash-cache-test.com`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenB = await signAccessToken({ userId: uB._id.toString(), email: uB.email });
    userB = { id: uB._id.toString(), email: uB.email, token: tokenB };

    // Create Profile B
    await Profile.create({
      user: uB._id,
      gender: "female",
      dob: new Date("1998-08-20"),
      height: 165,
      weight: 60,
      fitnessGoal: "weight_loss",
      activityLevel: "sedentary",
      dietaryPreference: "vegan",
      experienceLevel: "beginner",
      equipmentAvailable: ["bodyweight"],
      isProfileComplete: true,
    });

    // Test Exercise fixture
    const ex = await Exercise.create({
      name: `Dashboard Test Curl ${testTs}`,
      targetMuscle: "arms",
      equipment: "dumbbell",
      category: "strength",
      aliases: [`Test Curl ${testTs}`],
    });
    testExerciseId = ex._id.toString();

    // Test Food fixture
    const food = await FoodItem.create({
      name: `Dashboard Test Protein Shake ${testTs}`,
      category: "beverages",
      mealType: "snack",
      dietaryPreference: "vegetarian",
      calories: 200,
      protein: 25,
      carbs: 10,
      fat: 3,
      servingBasis: "per_serving",
      servingUnit: "shake",
      isActive: true,
      aliases: [],
    });
    testFoodId = food._id.toString();

    // Reset dashboard cache versions
    await invalidateDashboardCache(userA.id);
    await invalidateDashboardCache(userB.id);
  }, 30000);

  afterAll(async () => {
    if (userA?.id) {
      await WorkoutLog.deleteMany({ user: userA.id });
      await MealLog.deleteMany({ user: userA.id });
      await WaterLog.deleteMany({ user: userA.id });
      await Bmi.deleteMany({ user: userA.id });
      await Profile.deleteMany({ user: userA.id });
      await User.deleteOne({ _id: userA.id });
    }
    if (userB?.id) {
      await WorkoutLog.deleteMany({ user: userB.id });
      await MealLog.deleteMany({ user: userB.id });
      await WaterLog.deleteMany({ user: userB.id });
      await Bmi.deleteMany({ user: userB.id });
      await Profile.deleteMany({ user: userB.id });
      await User.deleteOne({ _id: userB.id });
    }
    if (testExerciseId) {
      await Exercise.deleteOne({ _id: testExerciseId });
    }
    if (testFoodId) {
      await FoodItem.deleteOne({ _id: testFoodId });
    }
  });

  function makeDashboardReq(token: string, timezone = "UTC") {
    return new NextRequest("http://localhost:3000/api/dashboard/stats", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-timezone": timezone,
      },
    });
  }

  it("isolates cache entries per user and timezone", async () => {
    // 1. User A in UTC
    const resA = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    expect(resA.status).toBe(200);
    const bodyA = await resA.json();
    expect(bodyA.data.profile.goal).toBe("muscle_building");

    // 2. User B in UTC must receive User B's profile, NOT User A's cached result
    const resB = await getDashboardHandler(makeDashboardReq(userB.token, "UTC"), {});
    expect(resB.status).toBe(200);
    const bodyB = await resB.json();
    expect(bodyB.data.profile.goal).toBe("weight_loss");

    // 3. User A in Asia/Kolkata timezone (isolated from UTC entry)
    const resATz = await getDashboardHandler(makeDashboardReq(userA.token, "Asia/Kolkata"), {});
    expect(resATz.status).toBe(200);
    const bodyATz = await resATz.json();
    expect(bodyATz.data.profile.goal).toBe("muscle_building");
  });

  it("warm reads avoid repeated dashboard queries (cache hit)", async () => {
    // Warm up cache for User A
    await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});

    // Spy on Profile.findOne to verify it is NOT called during warm read
    const profileSpy = vi.spyOn(Profile, "findOne");

    const warmRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    expect(warmRes.status).toBe(200);
    const warmBody = await warmRes.json();
    expect(warmBody.data.profile.goal).toBe("muscle_building");

    // DB query should be skipped on cache hit
    expect(profileSpy).not.toHaveBeenCalled();
    profileSpy.mockRestore();
  });

  it("POST /api/workout and DELETE /api/workout/[id] invalidate dashboard cache", async () => {
    // Verify initial count
    const initialRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const initialBody = await initialRes.json();
    const initialWorkoutsCount = initialBody.data.recentWorkouts.length;

    // Create a workout
    const postReq = new NextRequest("http://localhost:3000/api/workout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Arms Blast",
        totalDuration: 30,
        date: "2026-10-26",
        exercises: [
          {
            exerciseId: testExerciseId,
            sets: 3,
            reps: 12,
            weight: 20,
          },
        ],
      }),
    });
    const postRes = await createWorkoutHandler(postReq, {});
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    const workoutId = postBody.data._id;

    // Next dashboard read must reflect the new workout immediately
    const afterPostRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterPostBody = await afterPostRes.json();
    expect(afterPostBody.data.recentWorkouts.length).toBe(initialWorkoutsCount + 1);
    expect(afterPostBody.data.recentWorkouts[0].workoutType).toBe("Arms Blast");

    // Delete the workout
    const delReq = new NextRequest(`http://localhost:3000/api/workout/${workoutId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const delRes = await deleteWorkoutHandler(delReq, { params: Promise.resolve({ id: workoutId }) });
    expect(delRes.status).toBe(200);

    // Next dashboard read must reflect the deletion immediately
    const afterDelRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterDelBody = await afterDelRes.json();
    expect(afterDelBody.data.recentWorkouts.length).toBe(initialWorkoutsCount);
  });

  it("POST /api/meal and DELETE /api/meal/[id] invalidate dashboard cache", async () => {
    // Ensure warm baseline
    await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});

    // Create a meal
    const postReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mealType: "snack",
        title: "Post-Workout Shake",
        meals: [
          {
            foodItemId: testFoodId,
            quantity: 1,
            unit: "shake",
          },
        ],
      }),
    });
    const postRes = await createMealHandler(postReq, {});
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    const mealId = postBody.data._id;

    // Next dashboard read must reflect new meal immediately
    const afterPostRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterPostBody = await afterPostRes.json();
    const foundMeal = afterPostBody.data.recentMeals.find((m: { _id: string }) => m._id === mealId);
    expect(foundMeal).toBeDefined();

    // Delete meal
    const delReq = new NextRequest(`http://localhost:3000/api/meal/${mealId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const delRes = await deleteMealHandler(delReq, { params: Promise.resolve({ id: mealId }) });
    expect(delRes.status).toBe(200);

    // Next dashboard read must reflect deletion
    const afterDelRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterDelBody = await afterDelRes.json();
    const deletedMeal = afterDelBody.data.recentMeals.find((m: { _id: string }) => m._id === mealId);
    expect(deletedMeal).toBeUndefined();
  });

  it("POST /api/water and DELETE /api/water/[id] invalidate dashboard cache", async () => {
    // Baseline dashboard read
    const baseRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const baseBody = await baseRes.json();
    const initialWater = baseBody.data.stats.waterToday.totalMl;

    // Log water
    const postReq = new NextRequest("http://localhost:3000/api/water", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amountMl: 750,
      }),
    });
    const postRes = await createWaterHandler(postReq, {});
    expect(postRes.status).toBe(201);
    const postBody = await postRes.json();
    const waterId = postBody.data._id;

    // Next dashboard read must reflect new water intake
    const afterPostRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterPostBody = await afterPostRes.json();
    expect(afterPostBody.data.stats.waterToday.totalMl).toBe(initialWater + 750);

    // Delete water log
    const delReq = new NextRequest(`http://localhost:3000/api/water/${waterId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const delRes = await deleteWaterHandler(delReq, { params: Promise.resolve({ id: waterId }) });
    expect(delRes.status).toBe(200);

    // Next dashboard read must reflect restored water intake
    const afterDelRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterDelBody = await afterDelRes.json();
    expect(afterDelBody.data.stats.waterToday.totalMl).toBe(initialWater);
  });

  it("PATCH /api/profile and POST /api/profile invalidate dashboard cache", async () => {
    // Warm up
    await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});

    // Patch profile goal to 'maintain_weight'
    const patchReq = new NextRequest("http://localhost:3000/api/profile", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fitnessGoal: "maintain_weight",
      }),
    });
    const patchRes = await patchProfileHandler(patchReq, {});
    expect(patchRes.status).toBe(200);

    // Dashboard read reflects new goal
    const afterPatchRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterPatchBody = await afterPatchRes.json();
    expect(afterPatchBody.data.profile.goal).toBe("maintain_weight");

    // Post profile update (re-setup)
    const postReq = new NextRequest("http://localhost:3000/api/profile", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gender: "male",
        dob: "1995-05-15",
        height: 180,
        weight: 79,
        fitnessGoal: "muscle_building",
        activityLevel: "moderately_active",
        dietaryPreference: "none",
        experienceLevel: "intermediate",
        equipmentAvailable: ["barbell"],
      }),
    });
    const postRes = await createProfileHandler(postReq, {});
    expect(postRes.status).toBe(200);

    // Dashboard read reflects new goal & weight
    const afterPostRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const afterPostBody = await afterPostRes.json();
    expect(afterPostBody.data.profile.goal).toBe("muscle_building");
    expect(afterPostBody.data.stats.metrics.weight).toBe(79);
  });

  it("POST /api/bmi invalidates dashboard cache and updates charts", async () => {
    // Warm up
    await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});

    // Post new BMI
    const bmiReq = new NextRequest("http://localhost:3000/api/bmi", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userA.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        weight: 81,
        height: 180,
      }),
    });
    const bmiRes = await createBmiHandler(bmiReq, {});
    expect(bmiRes.status).toBe(201);

    // Next dashboard read reflects updated weight and trend
    const dashRes = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
    const dashBody = await dashRes.json();
    const trend = dashBody.data.charts.weightTrend;
    const latestWeight = trend[trend.length - 1]?.weight;
    expect(latestWeight).toBe(81);
  });

  it("preserves baseline BMI creation on cache miss if no BMI records exist", async () => {
    // Create a fresh User C with profile but NO BMI record
    const testTs = Date.now();
    const uC = await User.create({
      fullName: "Baseline Tester C",
      email: `user_c_${testTs}@dash-cache-test.com`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenC = await signAccessToken({ userId: uC._id.toString(), email: uC.email });

    await Profile.create({
      user: uC._id,
      gender: "male",
      dob: new Date("1992-03-10"),
      height: 175,
      weight: 70,
      fitnessGoal: "maintain_weight",
      activityLevel: "moderately_active",
      isProfileComplete: true,
    });

    // Verify 0 BMI records exist
    const countBefore = await Bmi.countDocuments({ user: uC._id });
    expect(countBefore).toBe(0);

    // Call dashboard handler
    const res = await getDashboardHandler(makeDashboardReq(tokenC, "UTC"), {});
    expect(res.status).toBe(200);
    const body = await res.json();

    // Baseline BMI must have been auto-created
    const countAfter = await Bmi.countDocuments({ user: uC._id });
    expect(countAfter).toBe(1);

    // Weight trend should contain the baseline record
    expect(body.data.charts.weightTrend.length).toBeGreaterThanOrEqual(1);
    expect(body.data.charts.weightTrend[0].weight).toBe(70);

    // Clean up User C
    await Bmi.deleteMany({ user: uC._id });
    await Profile.deleteOne({ user: uC._id });
    await User.deleteOne({ _id: uC._id });
  });

  it("Redis outage still permits successful database-backed reads", async () => {
    const redis = getRedisClient();
    // Temporarily mock redis.get to reject
    const originalGet = redis.get.bind(redis);
    vi.spyOn(redis, "get").mockRejectedValue(new Error("Simulated Redis Connection Down"));

    try {
      const res = await getDashboardHandler(makeDashboardReq(userA.token, "UTC"), {});
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.profile.goal).toBeDefined();
    } finally {
      vi.spyOn(redis, "get").mockImplementation(originalGet);
    }
  });
});
