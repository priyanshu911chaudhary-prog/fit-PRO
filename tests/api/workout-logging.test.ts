import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { Exercise } from "@/models/exercise";
import { WorkoutLog } from "@/models/workoutLog";
import { POST as createWorkoutHandler, GET as getWorkoutsHandler } from "@/app/api/workout/route";
import { DELETE as deleteWorkoutHandler } from "@/app/api/workout/[id]/route";
import { NextRequest } from "next/server";
import { signAccessToken } from "@/lib/auth/jwt";

describe("Workout Logging & Day-Level Aggregation API Integration", () => {
  let userA: { _id: mongoose.Types.ObjectId; email: string; token: string };
  let testExercise1: mongoose.Types.ObjectId;
  let testExercise2: mongoose.Types.ObjectId;

  const testDay = "2026-10-22";
  const otherDay = "2026-10-21";

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri!);
    }

    const testId = Date.now();
    const uA = await User.create({
      fullName: "Workout Aggregation Tester",
      email: `workout_agg_${testId}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenA = await signAccessToken({
      userId: uA._id.toString(),
      email: uA.email,
    });
    userA = { _id: uA._id, email: uA.email, token: tokenA };

    // Create 2 test exercises
    const ex1 = await Exercise.create({
      name: `Test Bench Press ${testId}`,
      targetMuscle: "chest",
      category: "strength",
      equipment: "barbell",
    });
    testExercise1 = ex1._id as mongoose.Types.ObjectId;

    const ex2 = await Exercise.create({
      name: `Test Cable Fly ${testId}`,
      targetMuscle: "chest",
      category: "strength",
      equipment: "cable",
    });
    testExercise2 = ex2._id as mongoose.Types.ObjectId;
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      if (userA?._id) {
        await WorkoutLog.deleteMany({ user: userA._id });
        await User.deleteOne({ _id: userA._id });
      }
      if (testExercise1) await Exercise.deleteOne({ _id: testExercise1 });
      if (testExercise2) await Exercise.deleteOne({ _id: testExercise2 });
    }
  });

  it("POST /api/workout saves the session with date and exercises", async () => {
    const body = {
      title: "Chest Hypertrophy",
      totalDuration: 45,
      date: testDay,
      exercises: [
        {
          exerciseId: testExercise1.toString(),
          sets: 3,
          reps: 10,
          weight: 80, // 3 * 10 * 80 = 2400 kg
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify(body),
    });

    const res = await createWorkoutHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.date).toBe(testDay);
    expect(json.data.exercises).toHaveLength(1);
    expect(json.data.exercises[0].sets).toBe(3);
    expect(json.data.exercises[0].reps).toBe(10);
    expect(json.data.exercises[0].weight).toBe(80);
  });

  it("GET /api/workout?date=... returns day-level aggregated dailyTotals", async () => {
    const req = new NextRequest(`http://localhost:3000/api/workout?date=${testDay}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });

    const res = await getWorkoutsHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.logs).toHaveLength(1);
    expect(json.data.dailyTotals).toBeDefined();

    // Session 1: 3 sets * 10 reps * 80 kg = 2400 kg volume tonnage, 3 sets, 1 distinct exercise, 45 mins duration
    expect(json.data.dailyTotals.totalVolumeTonnage).toBe(2400);
    expect(json.data.dailyTotals.totalSetsCount).toBe(3);
    expect(json.data.dailyTotals.exercisesCount).toBe(1);
    expect(json.data.dailyTotals.totalDuration).toBe(45);
    // 45 * 6 + Math.round(2400 / 120) = 270 + 20 = 290 kcal
    expect(json.data.dailyTotals.estimatedCaloriesBurn).toBe(290);
  });

  it("aggregates across multiple distinct sessions and exercises on the same date", async () => {
    // Add second workout on same day with testExercise2
    const body = {
      title: "Afternoon Cable Accessory",
      totalDuration: 25,
      date: testDay,
      exercises: [
        {
          exerciseId: testExercise2.toString(),
          sets: 2,
          reps: 15,
          weight: 20, // 2 * 15 * 20 = 600 kg
        },
      ],
    };

    const postReq = new NextRequest("http://localhost:3000/api/workout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify(body),
    });
    const postRes = await createWorkoutHandler(postReq, {});
    expect(postRes.status).toBe(201);

    // Fetch day totals again
    const getReq = new NextRequest(`http://localhost:3000/api/workout?date=${testDay}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const getRes = await getWorkoutsHandler(getReq, {});
    const json = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(json.data.logs).toHaveLength(2);

    // Combined:
    // Volume = 2400 + 600 = 3000 kg
    // Sets = 3 + 2 = 5 sets
    // Exercises = 2 distinct exercises (testExercise1 & testExercise2)
    // Duration = 45 + 25 = 70 mins
    // Calories = 70 * 6 + Math.round(3000 / 120) = 420 + 25 = 445 kcal
    expect(json.data.dailyTotals.totalVolumeTonnage).toBe(3000);
    expect(json.data.dailyTotals.totalSetsCount).toBe(5);
    expect(json.data.dailyTotals.exercisesCount).toBe(2);
    expect(json.data.dailyTotals.totalDuration).toBe(70);
    expect(json.data.dailyTotals.estimatedCaloriesBurn).toBe(445);
  });

  it("isolates workout data between calendar days", async () => {
    // Querying otherDay (where no workouts were logged) should return empty totals
    const req = new NextRequest(`http://localhost:3000/api/workout?date=${otherDay}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });

    const res = await getWorkoutsHandler(req, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.logs).toHaveLength(0);
    expect(json.data.dailyTotals.totalVolumeTonnage).toBe(0);
    expect(json.data.dailyTotals.totalSetsCount).toBe(0);
    expect(json.data.dailyTotals.exercisesCount).toBe(0);
    expect(json.data.dailyTotals.totalDuration).toBe(0);
    expect(json.data.dailyTotals.estimatedCaloriesBurn).toBe(0);
  });

  it("deleting a session recalculates day totals accurately", async () => {
    // Get existing logs
    const getReq = new NextRequest(`http://localhost:3000/api/workout?date=${testDay}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const getRes = await getWorkoutsHandler(getReq, {});
    const getJson = await getRes.json();
    const secondLogId = getJson.data.logs[0]._id;

    // Delete the second workout log
    const delReq = new NextRequest(`http://localhost:3000/api/workout/${secondLogId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const delRes = await deleteWorkoutHandler(delReq, { params: Promise.resolve({ id: secondLogId }) });
    expect(delRes.status).toBe(200);

    // Verify day totals reverted to session 1 values
    const verifyReq = new NextRequest(`http://localhost:3000/api/workout?date=${testDay}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const verifyRes = await getWorkoutsHandler(verifyReq, {});
    const verifyJson = await verifyRes.json();

    expect(verifyJson.data.logs).toHaveLength(1);
    expect(verifyJson.data.dailyTotals.totalVolumeTonnage).toBe(2400);
    expect(verifyJson.data.dailyTotals.totalSetsCount).toBe(3);
    expect(verifyJson.data.dailyTotals.exercisesCount).toBe(1);
    expect(verifyJson.data.dailyTotals.totalDuration).toBe(45);
  });
});
