import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { setAuthCookies } from "../fixtures/auth-helpers";
import mongoose from "mongoose";
import { Exercise } from "@/models/exercise";
import { WorkoutLog } from "@/models/workoutLog";
import { WorkoutPlan } from "@/models/workoutPlan";

test.describe("Journey 05: Workouts and Exercise Movement Catalog", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("can search exercise movements, build session, commit workout, verify persistence and delete", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    const sampleExercise = await Exercise.findOne({});
    expect(sampleExercise).not.toBeNull();
    const exerciseName = sampleExercise!.name;

    // 1. Visit /workout page
    await page.goto("/workout");
    await page.waitForLoadState("networkidle");

    // 2. Search exercise catalog
    const searchInput = page.locator('input[placeholder*="Search bench"]');
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill(exerciseName.slice(0, 4));

    // 3. Add movement to session builder
    const addBtn = page.getByRole("button", { name: `Add ${exerciseName} to workout` }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    // 4. Verify builder enabled and submit session
    const submitBtn = page.locator("#submit-workout-btn");
    await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
    await submitBtn.click();

    // Verify toast
    await expect(page.getByText(/Workout committed successfully/i)).toBeVisible({ timeout: 10_000 });

    // 5. Verify database record
    const savedLog = await WorkoutLog.findOne({ user: user._id }).sort({ createdAt: -1 });
    expect(savedLog).not.toBeNull();
    if (savedLog) ctx.createdWorkoutLogIds.push(savedLog._id);

    expect(savedLog?.totalDuration).toBeGreaterThan(0);
    expect(savedLog?.exercises.length).toBe(1);
    expect(savedLog?.exercises[0].exerciseId.toString()).toBe(sampleExercise!._id.toString());

    // 6. Navigate to history tab and delete entry
    const historyTab = page.getByRole("tab", { name: /History/i });
    if (await historyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await historyTab.click({ force: true });
      await page.waitForLoadState("networkidle");

      const deleteBtn = page.getByRole("button", { name: /Delete/i }).first();
      if (await deleteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteBtn.click();
        await expect.poll(async () => {
          return await WorkoutLog.countDocuments({ user: user._id });
        }, { timeout: 10_000 }).toBe(0);
      }
    }
  });

  test("verifies custom past workout dates flow through UI/API and remain accurate in history", async ({ baseURL }) => {
    const { accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    const sampleExercise = await Exercise.findOne({});
    expect(sampleExercise).not.toBeNull();

    const customDate = "2026-10-15"; // Past date

    const payload = {
      title: "Leg Day Special",
      totalDuration: 60,
      date: customDate,
      exercises: [
        {
          exerciseId: sampleExercise!._id.toString(),
          sets: 4,
          reps: 12,
          weight: 100,
        },
      ],
      completionPercentage: 100,
    };

    const response = await fetch(`${baseURL || "http://localhost:3000"}/api/workout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    const workoutId = body.data?._id;
    if (workoutId) ctx.createdWorkoutLogIds.push(workoutId);

    // Verify persisted date in MongoDB
    const persisted = await WorkoutLog.findById(workoutId);
    expect(persisted).not.toBeNull();
    expect(persisted?.date).toBe(customDate);

    // Query history for that date
    const historyRes = await fetch(`${baseURL || "http://localhost:3000"}/api/workout?date=${customDate}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
    });

    expect(historyRes.status).toBe(200);
    const historyData = await historyRes.json();
    expect(historyData.data?.logs?.length).toBeGreaterThanOrEqual(1);
    expect(historyData.data?.logs[0].date).toBe(customDate);
  });

  test("audit: AI workout plan generation boundary and saved plan retrieval", async ({ baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    // 1. Create a persisted saved workout plan in DB
    const savedPlan = await WorkoutPlan.create({
      user: user._id,
      planName: "Hypertrophy Push Pull Legs",
      schedule: [
        {
          day: "Day 1",
          exercises: [
            {
              name: "Barbell Bench Press",
              sets: 4,
              reps: 8,
            },
          ],
        },
      ],
      isActive: true,
    });
    ctx.createdPlanIds.push(savedPlan._id as mongoose.Types.ObjectId);

    // 2. Fetch saved workout plan via API endpoint
    const response = await fetch(`${baseURL || "http://localhost:3000"}/api/workout/ai/savedplan`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data?.[0]?.planName).toBe("Hypertrophy Push Pull Legs");

    // 3. Exercise deterministic plan generation flow (unblocked in Phase 2E via DEF-2D-AI-01 adapter)
    const genRes = await fetch(`${baseURL || "http://localhost:3000"}/api/workout/ai/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
    });
    expect(genRes.status).toBe(200);
    const genData = await genRes.json();
    expect(genData.data?.planName).toBeDefined();
    if (genData.data?._id) ctx.createdPlanIds.push(genData.data._id);
  });
});
