import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { User } from "@/models/user";
import { Exercise } from "@/models/exercise";
import { FoodItem } from "@/models/foodItem";
import { WorkoutLog } from "@/models/workoutLog";
import { MealLog } from "@/models/mealLog";
import { WaterLog } from "@/models/waterLog";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { LeaderboardOutbox } from "@/models/leaderboardOutbox";
import { signAccessToken } from "@/lib/auth/jwt";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";
import { getCompetitionWeek, formatCompetitionDate } from "@/lib/leaderboard/calendar";
import { getUserLeaderboardRank } from "@/lib/leaderboard/redis-ranking";
import { processLeaderboardOutbox } from "@/lib/leaderboard/recomputation";

import { POST as createWorkoutHandler } from "@/app/api/workout/route";
import { DELETE as deleteWorkoutHandler } from "@/app/api/workout/[id]/route";
import { POST as createMealHandler } from "@/app/api/meal/route";
import { DELETE as deleteMealHandler } from "@/app/api/meal/[id]/route";
import { POST as createWaterHandler } from "@/app/api/water/route";
import { DELETE as deleteWaterHandler } from "@/app/api/water/[id]/route";

describe("Leaderboard Mutation Triggers & Outbox Resilience (Part D & Part G)", () => {
  let redis: ReturnType<typeof getRedisClient>;
  let user: { id: string; email: string; token: string };
  let testExerciseId: string;
  let testFoodId: string;

  const currentWeek = getCompetitionWeek(new Date());
  // Pick active scoring days for logging
  const mondayDate = currentWeek.days[0];
  const tuesdayDate = currentWeek.days[1];

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri!);
    }
    redis = getRedisClient();
    await ensureRedisConnected(redis);

    const ts = Date.now();
    const u = await User.create({
      fullName: "Mutation Champion",
      email: `mutation_${ts}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    const token = await signAccessToken({ userId: u._id.toString(), email: u.email });
    user = { id: u._id.toString(), email: u.email, token };

    const ex = await Exercise.create({
      name: `Squat Test ${ts}`,
      targetMuscle: "legs",
      category: "strength",
      equipment: "barbell",
    });
    testExerciseId = ex._id.toString();

    const food = await FoodItem.create({
      name: `Chicken Breast ${ts}`,
      protein: 30,
      carbs: 0,
      fat: 3,
      calories: 150,
      servingBasis: "per_100g",
      servingUnit: "g",
      servingWeightG: 100,
    });
    testFoodId = food._id.toString();

    // Configure user settings
    await LeaderboardSettings.create({
      user: user.id,
      optIn: true,
      displayName: "MutationChamp",
      weeklyWorkoutGoal: 3,
      dailyProteinTarget: 100,
      dailyHydrationTarget: 2500,
    });
  });

  beforeEach(async () => {
    await WorkoutLog.deleteMany({ user: user.id });
    await MealLog.deleteMany({ user: user.id });
    await WaterLog.deleteMany({ user: user.id });
    await WeeklyLeaderboardEntry.deleteMany({ user: user.id });
    await LeaderboardOutbox.deleteMany({});
    if (redis) {
      await redis.del(`leaderboard:weekly:${currentWeek.weekStart}`);
    }
  });

  afterAll(async () => {
    await WorkoutLog.deleteMany({ user: user.id });
    await MealLog.deleteMany({ user: user.id });
    await WaterLog.deleteMany({ user: user.id });
    await WeeklyLeaderboardEntry.deleteMany({ user: user.id });
    await LeaderboardOutbox.deleteMany({ user: user.id });
    await LeaderboardSettings.deleteMany({ user: user.id });
    await Exercise.deleteOne({ _id: testExerciseId });
    await FoodItem.deleteOne({ _id: testFoodId });
    await User.deleteOne({ _id: user.id });
    if (redis) {
      await redis.del(`leaderboard:weekly:${currentWeek.weekStart}`);
    }
  });

  describe("Activity Writes Trigger Automatic Recalculation", () => {
    it("POST /api/workout triggers leaderboard recalculation and updates Redis", async () => {
      const req = new NextRequest("http://localhost:3000/api/workout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: mondayDate,
          totalDuration: 45, // >= 15 min
          completionPercentage: 100, // >= 70%
          exercises: [
            {
              exercise: testExerciseId,
              sets: [{ reps: 10, weight: 80, completed: true }],
            },
          ],
        }),
      });

      const res = await createWorkoutHandler(req, {});
      expect(res.status).toBe(201);

      // Verify that WeeklyLeaderboardEntry exists in MongoDB
      const entry = await WeeklyLeaderboardEntry.findOne({
        user: user.id,
        weekStart: currentWeek.weekStart,
      });
      expect(entry).toBeDefined();
      expect(entry?.qualifyingWorkoutsCount).toBe(1);
      // Attainment: 1/3 = 0.3333, workout component score: 0.3333 * 40 = ~13.33 points
      expect(entry?.displayScore).toBeGreaterThan(10);
      expect(entry?.scoreBasisPoints).toBeGreaterThan(1000);

      // Verify Redis sorted set has been updated
      const rankData = await getUserLeaderboardRank(currentWeek.weekStart, user.id);
      expect(rankData.scoreBasisPoints).toBe(entry?.scoreBasisPoints);
    });

    it("POST /api/meal and POST /api/water update protein and hydration adherence", async () => {
      // 1. Create a meal log
      const mealReq = new NextRequest("http://localhost:3000/api/meal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "High Protein Lunch",
          mealType: "lunch",
          consumedDate: mondayDate,
          meals: [
            {
              foodItemId: testFoodId,
              quantity: 200, // 200g * (30g / 100g) = 60g protein
              unit: "g",
            },
          ],
        }),
      });
      const mealRes = await createMealHandler(mealReq, {});
      expect(mealRes.status).toBe(201);

      // 2. Create a water log
      const waterReq = new NextRequest("http://localhost:3000/api/water", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountMl: 2500, // 100% of daily hydration goal for Monday
          date: `${mondayDate}T10:00:00Z`,
        }),
      });
      const waterRes = await createWaterHandler(waterReq, {});
      expect(waterRes.status).toBe(201);

      const entry = await WeeklyLeaderboardEntry.findOne({
        user: user.id,
        weekStart: currentWeek.weekStart,
      });
      expect(entry).toBeDefined();
      // Monday water was 100% (attainment 1.0 / 7 days = 0.1428)
      // Hydration component: 0.1428 * 30 = ~4.28 points
      expect(entry?.hydrationComponent).toBeGreaterThan(0.1);
      // Protein 60g / 100g = 0.60 / 7 days = ~0.0857
      expect(entry?.proteinComponent).toBeGreaterThan(0.05);
    });
  });

  describe("Activity Deletions Recalculate Current-Week Scores", () => {
    it("DELETE /api/workout/[id] lowers attainment and updates score", async () => {
      // First create a workout
      const createReq = new NextRequest("http://localhost:3000/api/workout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: mondayDate,
          totalDuration: 40,
          completionPercentage: 100,
          exercises: [
            {
              exercise: testExerciseId,
              sets: [{ reps: 8, weight: 100, completed: true }],
            },
          ],
        }),
      });
      const createRes = await createWorkoutHandler(createReq, {});
      const createdJson = await createRes.json();
      const workoutId = createdJson.data._id;

      // Verify score is > 0
      const entryBefore = await WeeklyLeaderboardEntry.findOne({
        user: user.id,
        weekStart: currentWeek.weekStart,
      });
      expect(entryBefore?.qualifyingWorkoutsCount).toBe(1);

      // Now delete the workout
      const deleteReq = new NextRequest(`http://localhost:3000/api/workout/${workoutId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const deleteRes = await deleteWorkoutHandler(deleteReq, {
        params: Promise.resolve({ id: workoutId }),
      });
      expect(deleteRes.status).toBe(200);

      // Verify recalculated entry now has 0 qualifying workouts and 0 workout attainment
      const entryAfter = await WeeklyLeaderboardEntry.findOne({
        user: user.id,
        weekStart: currentWeek.weekStart,
      });
      expect(entryAfter?.qualifyingWorkoutsCount).toBe(0);
      expect(entryAfter?.workoutComponent).toBe(0);
    });
  });

  describe("Outbox Pattern & Non-blocking Resilience", () => {
    it("handles pending jobs in LeaderboardOutbox and recovers score", async () => {
      // Create a workout log using the API
      const workoutReq = new NextRequest("http://localhost:3000/api/workout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: mondayDate,
          totalDuration: 30,
          completionPercentage: 100,
          exercises: [
            {
              exercise: testExerciseId,
              sets: [{ reps: 10, weight: 50, completed: true }],
            },
          ],
        }),
      });
      await createWorkoutHandler(workoutReq, {});

      // Reset leaderboard entry to simulate a failed background recomputation
      await WeeklyLeaderboardEntry.deleteOne({ user: user.id, weekStart: currentWeek.weekStart });

      // Record a pending outbox job
      await LeaderboardOutbox.create({
        user: user.id,
        weekStart: currentWeek.weekStart,
        status: "pending",
        attempts: 0,
      });

      // Process outbox
      const processedCount = await processLeaderboardOutbox(10);
      expect(processedCount).toBeGreaterThanOrEqual(1);

      // Verify outbox job was drained
      const pendingJob = await LeaderboardOutbox.findOne({
        user: user.id,
        weekStart: currentWeek.weekStart,
        status: "pending",
      });
      expect(pendingJob).toBeNull();

      // Verify score was recovered in MongoDB
      const entry = await WeeklyLeaderboardEntry.findOne({
        user: user.id,
        weekStart: currentWeek.weekStart,
      });
      expect(entry?.qualifyingWorkoutsCount).toBe(1);
      expect(entry?.displayScore).toBeGreaterThan(0);
    });
  });
});
