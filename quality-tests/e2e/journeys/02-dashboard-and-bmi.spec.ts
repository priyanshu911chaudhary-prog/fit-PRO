import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { setAuthCookies } from "../fixtures/auth-helpers";
import { Bmi } from "@/models/bmi";
import { WorkoutLog } from "@/models/workoutLog";

test.describe("Journey 02: Dashboard and BMI Metrics", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("dashboard displays metrics consistent with persisted profile and baseline BMI", async ({ page, context, baseURL }) => {
    const { accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Check greeting and header load cleanly without client errors
    await expect(page.locator("h1")).toContainText(/Athlete|Welcome|Back/i);

    // Verify Telemetry HUD shows BMI metric matching fixture (24.1)
    await expect(page.getByText("Body Mass Index")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("24.1")).toBeVisible({ timeout: 10_000 });
  });

  test("can log new BMI measurement, verify persistence in DB and updated dashboard display", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // Visit /bmi measurement page
    await page.goto("/bmi");
    await page.waitForLoadState("networkidle");

    // Fill in new anthropometric measurement: 85kg at 180cm -> BMI = 85 / (1.80^2) = 26.2 (Overweight)
    const weightInput = page.locator('input#weight');
    await expect(weightInput).toBeVisible({ timeout: 10_000 });
    await weightInput.fill("85");

    const submitBtn = page.getByRole("button", { name: /Commit Anthropometric Log/i });
    await expect(submitBtn).toBeVisible();

    const [postRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/bmi") && res.request().method() === "POST"),
      submitBtn.click(),
    ]);
    expect(postRes.status()).toBe(201);

    // Verify persisted record in MongoDB
    await expect.poll(async () => {
      const log = await Bmi.findOne({ user: user._id, weight: 85 });
      return log?.weight;
    }, { timeout: 10_000 }).toBe(85);

    const latestBmi = await Bmi.findOne({ user: user._id, weight: 85 });
    expect(latestBmi).not.toBeNull();
    if (latestBmi) ctx.createdBmiIds.push(latestBmi._id);
    expect(latestBmi?.bmi).toBe(26.2);

    // Navigate to /dashboard and assert updated BMI reflects on HUD
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("26.2")).toBeVisible({ timeout: 10_000 });
  });

  test("audit: streak calculation behavior on custom past workout date vs createdAt", async ({ baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    // Calculate yesterday's date in UTC
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateStr = yesterday.toISOString().split("T")[0];

    // Insert a workout log with a custom past date (yesterday) but inserted right now (createdAt = now)
    const workout = await WorkoutLog.create({
      user: user._id,
      title: "Yesterday Leg Session",
      totalDuration: 45,
      date: yesterdayDateStr, // Custom workout date: yesterday
      exercises: [],
      completionPercentage: 100,
    });
    ctx.createdWorkoutLogIds.push(workout._id);

    // Request dashboard stats directly with auth header
    const response = await fetch(`${baseURL || "http://localhost:3000"}/api/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Source audit evidence:
    // In src/app/api/dashboard/stats/route.ts, line 24 selects only 'createdAt' and line 55 maps 'log.createdAt',
    // ignoring 'log.date'. Since createdAt is today, the workout is mapped to today instead of yesterday!
    // We document whether streak considers log.date or only log.createdAt.
    const streakValue = data.data?.streak ?? data.data?.stats?.streak;
    console.log(`[AUDIT EVIDENCE] Streak value for workout logged with custom date "${yesterdayDateStr}" and today's createdAt: ${streakValue}`);
  });
});

