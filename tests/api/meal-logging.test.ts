import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { FoodItem } from "@/models/foodItem";
import { MealLog } from "@/models/mealLog";
import { POST as createMealHandler, GET as getMealsHandler } from "@/app/api/meal/route";
import { DELETE as deleteMealHandler } from "@/app/api/meal/[id]/route";
import { NextRequest } from "next/server";
import { signAccessToken } from "@/lib/auth/jwt";

describe("Meal Logging & Nutrition Tracking API Integration", () => {
  let userA: { _id: mongoose.Types.ObjectId; email: string; token: string };
  let userB: { _id: mongoose.Types.ObjectId; email: string; token: string };
  let testFood1: mongoose.Types.ObjectId;
  let testFood2: mongoose.Types.ObjectId;
  let testFood3: mongoose.Types.ObjectId;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri!);
    }

    const testId = Date.now();
    // Create test user A
    const uA = await User.create({
      fullName: "Meal Tester A",
      email: `meal_user_a_${testId}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenA = await signAccessToken({
      userId: uA._id.toString(),
      email: uA.email,
    });
    userA = { _id: uA._id, email: uA.email, token: tokenA };

    // Create test user B
    const uB = await User.create({
      fullName: "Meal Tester B",
      email: `meal_user_b_${testId}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenB = await signAccessToken({
      userId: uB._id.toString(),
      email: uB.email,
    });
    userB = { _id: uB._id, email: uB.email, token: tokenB };

    // Create test foods
    const f1 = await FoodItem.create({
      name: `Test Tomato ${testId}`,
      calories: 18,
      protein: 0.9,
      carbs: 3.9,
      fat: 0.2,
      servingBasis: "per_100g",
      servingUnit: "g",
      defaultQuantity: 100,
      category: "vegetables",
      aliases: ["test_tamatar"],
      isActive: true,
    });
    testFood1 = f1._id;

    const f2 = await FoodItem.create({
      name: `Test Whole Egg ${testId}`,
      calories: 143,
      protein: 12.6,
      carbs: 0.7,
      fat: 9.5,
      servingBasis: "per_100g",
      servingUnit: "piece",
      pieceWeightG: 50,
      category: "protein",
      aliases: ["test_egg"],
      isActive: true,
    });
    testFood2 = f2._id;

    const f3 = await FoodItem.create({
      name: `Test Peanut Butter ${testId}`,
      calories: 588,
      protein: 25.0,
      carbs: 20.0,
      fat: 50.0,
      servingBasis: "per_100g",
      servingUnit: "g",
      servingWeightG: 32, // 32g per serving
      category: "fats_oils",
      aliases: ["test_peanut_butter"],
      isActive: true,
    });
    testFood3 = f3._id;
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      if (userA?._id) {
        await MealLog.deleteMany({ user: userA._id });
        await User.deleteOne({ _id: userA._id });
      }
      if (userB?._id) {
        await MealLog.deleteMany({ user: userB._id });
        await User.deleteOne({ _id: userB._id });
      }
      if (testFood1) await FoodItem.deleteOne({ _id: testFood1 });
      if (testFood2) await FoodItem.deleteOne({ _id: testFood2 });
      if (testFood3) await FoodItem.deleteOne({ _id: testFood3 });
    }
  });

  it("POST /api/meal authoritatively calculates nutrition and ignores spoofed client totals", async () => {
    // 200g tomato = 2x 18 kcal = 36 kcal
    // 2 eggs (100g) = 1x 143 kcal = 143 kcal
    // Expected total: 179 kcal, 14.4g protein (1.8 + 12.6), 8.5g carbs (7.8 + 0.7), 9.9g fat (0.4 + 9.5)
    const requestBody = {
      title: "Nutritious Breakfast",
      mealType: "breakfast",
      consumedDate: "2026-10-21",
      totalCalories: 99999, // Spoofed! Server must ignore this!
      meals: [
        {
          foodItemId: testFood1.toString(),
          quantity: 200,
          unit: "g",
        },
        {
          foodItemId: testFood2.toString(),
          quantity: 2,
          unit: "piece",
        },
      ],
    };

    const req = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const res = await createMealHandler(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.totalCalories).toBe(179); // Not 99999!
    expect(data.data.totalProtein).toBeCloseTo(14.4, 1);
    expect(data.data.totalCarbs).toBeCloseTo(8.5, 1);
    expect(data.data.totalFat).toBeCloseTo(9.9, 1);
    expect(data.data.mealType).toBe("breakfast");
    expect(data.data.consumedDate).toBe("2026-10-21");

    // Check snapshots
    const items = data.data.meals;
    expect(items).toHaveLength(2);
    expect(items[0].name).toContain("Test Tomato");
    expect(items[0].calories).toBe(36);
    expect(items[0].unit).toBe("g");
    expect(items[1].name).toContain("Test Whole Egg");
    expect(items[1].calories).toBe(143);
    expect(items[1].unit).toBe("piece");
  });

  it("POST /api/meal rejects invalid or non-existent food IDs with 400", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const req = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        mealType: "lunch",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: fakeId, quantity: 100, unit: "g" }],
      }),
    });

    const res = await createMealHandler(req, {});
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("GET /api/meal with date filter aggregates daily totals across meals for that date", async () => {
    // Add lunch meal on 2026-10-21 for User A: 100g tomato = 18 kcal
    const lunchBody = {
      mealType: "lunch",
      consumedDate: "2026-10-21",
      meals: [{ foodItemId: testFood1.toString(), quantity: 100, unit: "g" }],
    };

    const postReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify(lunchBody),
    });
    await createMealHandler(postReq, {});

    // Now query for 2026-10-21
    const getReq = new NextRequest("http://localhost:3000/api/meal?date=2026-10-21", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });

    const res = await getMealsHandler(getReq, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.logs.length).toBeGreaterThanOrEqual(2);
    // Daily totals should be sum of Breakfast (179 kcal) + Lunch (18 kcal) = 197 kcal
    expect(data.data.dailyTotals.totalCalories).toBe(197);
    expect(data.data.dailyTotals.proteinPct + data.data.dailyTotals.carbsPct + data.data.dailyTotals.fatPct).toBe(100);
  });

  it("enforces user isolation: User B cannot view User A's meal logs", async () => {
    const getReq = new NextRequest("http://localhost:3000/api/meal?date=2026-10-21", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userB.token}`,
      },
    });

    const res = await getMealsHandler(getReq, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.data.logs).toHaveLength(0);
    expect(data.data.dailyTotals.totalCalories).toBe(0);
  });

  it("DELETE /api/meal/[id] deletes log and rejects unauthorized deletion attempts", async () => {
    // User A has logs; find one
    const aLog = await MealLog.findOne({ user: userA._id });
    expect(aLog).not.toBeNull();

    // User B tries to delete User A's log -> 404 unauthorized
    const unauthorizedReq = new NextRequest(`http://localhost:3000/api/meal/${aLog!._id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userB.token}`,
      },
    });
    const unauthRes = await deleteMealHandler(unauthorizedReq, {
      params: Promise.resolve({ id: aLog!._id.toString() }),
    });
    expect(unauthRes.status).toBe(404);

    // User A deletes own log -> 200 OK
    const authReq = new NextRequest(`http://localhost:3000/api/meal/${aLog!._id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userA.token}`,
      },
    });
    const authRes = await deleteMealHandler(authReq, {
      params: Promise.resolve({ id: aLog!._id.toString() }),
    });
    expect(authRes.status).toBe(200);

    const checkDeleted = await MealLog.findById(aLog!._id);
    expect(checkDeleted).toBeNull();
  });

  it("ensures historical nutrition snapshots remain immutable when catalog foods are updated", async () => {
    // 1. Log a meal with testFood1 (100g test tomato = 18 kcal)
    const logReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        title: "Historical Snapshot Test",
        mealType: "snack",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood1.toString(), quantity: 100, unit: "g" }],
      }),
    });

    const createRes = await createMealHandler(logReq, {});
    const createData = await createRes.json();
    const createdLogId = createData.data._id;
    expect(createData.data.totalCalories).toBe(18);
    expect(createData.data.meals[0].calories).toBe(18);

    // 2. Mutate catalog entry directly (e.g. Tomato catalog changed from 18 to 999 kcal)
    await FoodItem.findByIdAndUpdate(testFood1, { calories: 999, protein: 99 });

    // 3. Retrieve the historical log
    const getReq = new NextRequest("http://localhost:3000/api/meal?date=2026-10-21", {
      method: "GET",
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const getRes = await getMealsHandler(getReq, {});
    const getData = await getRes.json();

    const historicalLog = getData.data.logs.find((l: { _id: string }) => l._id === createdLogId);
    expect(historicalLog).toBeDefined();
    // Historical totals must NOT mutate to 999; must remain 18!
    expect(historicalLog.totalCalories).toBe(18);
    expect(historicalLog.meals[0].calories).toBe(18);

    // Restore catalog food
    await FoodItem.findByIdAndUpdate(testFood1, { calories: 18, protein: 0.9 });
  });

  it("POST /api/meal strictly rejects zero, negative, and nonnumeric quantities", async () => {
    // 1. Zero quantity
    const zeroReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        mealType: "lunch",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood1.toString(), quantity: 0, unit: "g" }],
      }),
    });
    const zeroRes = await createMealHandler(zeroReq, {});
    expect(zeroRes.status).toBe(400);

    // 2. Negative quantity
    const negReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        mealType: "lunch",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood1.toString(), quantity: -5, unit: "g" }],
      }),
    });
    const negRes = await createMealHandler(negReq, {});
    expect(negRes.status).toBe(400);

    // 3. Nonnumeric string
    const stringReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        mealType: "lunch",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood1.toString(), quantity: "abc", unit: "g" }],
      }),
    });
    const stringRes = await createMealHandler(stringReq, {});
    expect(stringRes.status).toBe(400);
  });

  it("POST /api/meal accepts valid fractional quantities", async () => {
    // 1.5 portions of 100g tomato = 150g = 27 kcal
    const req = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        title: "Fractional Portion Snack",
        mealType: "snack",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood1.toString(), quantity: 150, unit: "g" }],
      }),
    });
    const res = await createMealHandler(req, {});
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.data.totalCalories).toBe(27);
  });

  it("POST /api/meal preserves servingWeightG with 100% parity to draft preview calculations", async () => {
    // Peanut butter testFood3: 588 kcal / 100g, servingWeightG = 32g
    // 1 serving = 32g = 0.32x basis -> 188.16 kcal -> 188 kcal, 8g protein, 6.4g carbs, 16g fat
    const req = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        title: "Peanut Butter Toast Component",
        mealType: "breakfast",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood3.toString(), quantity: 1, unit: "serving" }],
      }),
    });
    const res = await createMealHandler(req, {});
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.data.totalCalories).toBe(188);
    expect(data.data.totalProtein).toBeCloseTo(8.0, 1);
    expect(data.data.totalCarbs).toBeCloseTo(6.4, 1);
    expect(data.data.totalFat).toBeCloseTo(16.0, 1);
    expect(data.data.meals[0].unit).toBe("serving");
  });

  it("POST /api/meal strictly rejects unsupported units and missing serving weights", async () => {
    // 1. Incompatible unit: volume "ml" on mass-based tomato without density
    const volReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        mealType: "lunch",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood1.toString(), quantity: 200, unit: "ml" }],
      }),
    });
    const volRes = await createMealHandler(volReq, {});
    expect(volRes.status).toBe(400);
    const volData = await volRes.json();
    expect(volData.message).toMatch(/density|Cannot convert volume/);

    // 2. Unit "serving" on testFood1 which has NO configured servingWeightG
    const srvReq = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`,
      },
      body: JSON.stringify({
        mealType: "lunch",
        consumedDate: "2026-10-21",
        meals: [{ foodItemId: testFood1.toString(), quantity: 1, unit: "serving" }],
      }),
    });
    const srvRes = await createMealHandler(srvReq, {});
    expect(srvRes.status).toBe(400);
    const srvData = await srvRes.json();
    expect(srvData.message).toMatch(/serving weight is not configured/);
  });

  it("ensures date navigation and date-specific query isolate meals between calendar days", async () => {
    // 1. Log a meal specifically on date 2026-11-01 (100g tomato = 18 kcal)
    const mealDay1Req = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userB.token}`,
      },
      body: JSON.stringify({
        title: "November First Meal",
        mealType: "breakfast",
        consumedDate: "2026-11-01",
        meals: [{ foodItemId: testFood1.toString(), quantity: 100, unit: "g" }],
      }),
    });
    const mealDay1Res = await createMealHandler(mealDay1Req, {});
    expect(mealDay1Res.status).toBe(201);

    // 2. Log a meal specifically on date 2026-11-02 (2 eggs = 143 kcal)
    const mealDay2Req = new NextRequest("http://localhost:3000/api/meal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userB.token}`,
      },
      body: JSON.stringify({
        title: "November Second Meal",
        mealType: "lunch",
        consumedDate: "2026-11-02",
        meals: [{ foodItemId: testFood2.toString(), quantity: 2, unit: "piece" }],
      }),
    });
    const mealDay2Res = await createMealHandler(mealDay2Req, {});
    expect(mealDay2Res.status).toBe(201);

    // 3. Query Day 1: must return ONLY November 1 meal and 18 kcal
    const queryDay1 = new NextRequest("http://localhost:3000/api/meal?date=2026-11-01", {
      method: "GET",
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const resDay1 = await getMealsHandler(queryDay1, {});
    const dataDay1 = await resDay1.json();
    expect(resDay1.status).toBe(200);
    expect(dataDay1.data.logs).toHaveLength(1);
    expect(dataDay1.data.logs[0].consumedDate).toBe("2026-11-01");
    expect(dataDay1.data.dailyTotals.totalCalories).toBe(18);

    // 4. Query Day 2: must return ONLY November 2 meal and 143 kcal
    const queryDay2 = new NextRequest("http://localhost:3000/api/meal?date=2026-11-02", {
      method: "GET",
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    const resDay2 = await getMealsHandler(queryDay2, {});
    const dataDay2 = await resDay2.json();
    expect(resDay2.status).toBe(200);
    expect(dataDay2.data.logs).toHaveLength(1);
    expect(dataDay2.data.logs[0].consumedDate).toBe("2026-11-02");
    expect(dataDay2.data.dailyTotals.totalCalories).toBe(143);
  });
});
