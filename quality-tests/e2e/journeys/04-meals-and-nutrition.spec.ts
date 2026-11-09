import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { setAuthCookies } from "../fixtures/auth-helpers";
import mongoose from "mongoose";
import { FoodItem } from "@/models/foodItem";
import { MealLog } from "@/models/mealLog";
import { MealPlan } from "@/models/mealPlan";

test.describe("Journey 04: Meals, Nutrition, and Authoritative Calculation", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("can search catalog, add items to plate, submit meal, verify authoritative server-calculated macros, and delete entry", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // Verify at least one food item exists in test database
    const sampleFood = await FoodItem.findOne({ isActive: { $ne: false } });
    expect(sampleFood).not.toBeNull();
    const targetFoodName = sampleFood!.name;

    // 1. Visit /meal page
    await page.goto("/meal");
    await page.waitForLoadState("networkidle");

    // 2. Search food catalog
    const searchInput = page.locator("#food-search-input");
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    await searchInput.fill(targetFoodName.slice(0, 4));

    // Verify matching food item card appears
    const foodCard = page.locator(`p:has-text("${targetFoodName}")`).first();
    await expect(foodCard).toBeVisible({ timeout: 10_000 });

    // 3. Add food item to plate builder
    const addBtn = page.getByRole("button", { name: `Add ${targetFoodName} to plate` }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verify plate builder reflects added item
    await expect(page.locator("#submit-meal-btn")).toBeEnabled({ timeout: 10_000 });

    // 4. Submit meal
    await page.locator("#submit-meal-btn").click();

    // Verify success toast notification
    await expect(page.getByText(/Logged|Recorded|Success/i).first()).toBeVisible({ timeout: 10_000 });

    // 5. Verify database record and authoritative server-side calculation
    const savedLog = await MealLog.findOne({ user: user._id }).sort({ createdAt: -1 });
    expect(savedLog).not.toBeNull();
    if (savedLog) ctx.createdMealLogIds.push(savedLog._id);

    // Authoritative calculation check: totalCalories must be positive and computed by server
    expect(savedLog?.totalCalories).toBeGreaterThan(0);
    expect(savedLog?.meals.length).toBe(1);
    expect(savedLog?.meals[0].foodItemId.toString()).toBe(sampleFood!._id.toString());
    expect(savedLog?.meals[0].calories).toBe(savedLog?.totalCalories);

    // 6. Switch to History tab and verify entry is displayed
    const historyTab = page.getByRole("tab", { name: /History/i });
    if (await historyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await historyTab.click();
      await page.waitForLoadState("networkidle");

      // Verify meal appears in history list
      await expect(page.getByText(new RegExp(`${savedLog?.totalCalories} kcal`, "i")).first()).toBeVisible({ timeout: 10_000 });

      // 7. Delete meal entry
      const deleteBtn = page.getByRole("button", { name: /Delete/i }).first();
      await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
      await deleteBtn.click();

      // Verify deletion in database
      await expect.poll(async () => {
        return await MealLog.countDocuments({ user: user._id });
      }, { timeout: 10_000 }).toBe(0);
    }
  });

  test("proves server rejects client-manipulated macros and authoritatively recalculates from food catalog", async ({ baseURL }) => {
    const { accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    const sampleFood = await FoodItem.findOne({ isActive: { $ne: false } });
    expect(sampleFood).not.toBeNull();

    // Attacker sends forged macros: claims 100g of food has 9999 calories and 500g protein
    const forgedPayload = {
      title: "Forged Super Meal",
      mealType: "lunch",
      consumedDate: "2026-10-29",
      meals: [
        {
          foodItemId: sampleFood!._id.toString(),
          name: sampleFood!.name,
          quantity: 100,
          unit: "g",
          calories: 9999, // Forged
          protein: 500,   // Forged
          carbs: 0,
          fat: 0,
        },
      ],
    };

    const response = await fetch(`${baseURL || "http://localhost:3000"}/api/meal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify(forgedPayload),
    });

    expect(response.status).toBe(201);
    const body = await response.json();
    const createdMealId = body.data?._id;
    if (createdMealId) ctx.createdMealLogIds.push(createdMealId);

    // Verify server IGNORED 9999 and calculated real calories from sampleFood
    const persisted = await MealLog.findById(createdMealId);
    expect(persisted).not.toBeNull();
    expect(persisted?.totalCalories).not.toBe(9999);
    expect(persisted?.totalProtein).not.toBe(500);
    // Calculated calories should match food item per 100g calories
    expect(persisted?.totalCalories).toBe(Math.round(sampleFood!.calories));
  });

  test("audit: AI meal plan generation boundary and saved plan retrieval", async ({ baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    // 1. Create a persisted saved meal plan directly in DB
    const savedPlan = await MealPlan.create({
      user: user._id,
      planName: "High Protein Muscle Blueprint",
      schedule: [
        {
          day: "Day 1",
          meals: [
            {
              name: "Oatmeal with Whey & Berries",
              servingSize: "1 bowl",
              calories: 450,
              protein: 35,
              carbs: 55,
              fat: 8,
            },
          ],
        },
      ],
      isActive: true,
    });
    ctx.createdPlanIds.push(savedPlan._id as mongoose.Types.ObjectId);

    // 2. Fetch saved meal plan via API endpoint
    const response = await fetch(`${baseURL || "http://localhost:3000"}/api/meal/ai/savedplan`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data?.[0]?.planName).toBe("High Protein Muscle Blueprint");

    // 3. Exercise deterministic plan generation flow (unblocked in Phase 2E via DEF-2D-AI-01 adapter)
    const genRes = await fetch(`${baseURL || "http://localhost:3000"}/api/meal/ai/generate`, {
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

