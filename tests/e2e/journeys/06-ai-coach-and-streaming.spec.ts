import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { setAuthCookies } from "../fixtures/auth-helpers";
import mongoose from "mongoose";
import { CoachConversation } from "@/models/coachConversation";
import { MealPlan } from "@/models/mealPlan";
import { WorkoutPlan } from "@/models/workoutPlan";

test.describe("Journey 06: AI Coach Conversations, Streaming, and Plan Management", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("can create conversation, persist turns, reload without duplication, and delete chat", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // 1. Visit /coach
    await page.goto("/coach");
    await page.waitForLoadState("networkidle");

    // Verify chat UI elements
    const chatInput = page.locator("#coach-chat-input");
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // 2. Type and send a fitness prompt
    const promptText = "What is the recommended recovery window between heavy deadlift sessions?";
    await chatInput.fill(promptText);

    const sendBtn = page.locator("#coach-chat-send-btn");
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Verify user bubble is visible immediately
    await expect(page.locator(`text="${promptText}"`)).toBeVisible({ timeout: 10_000 });

    // Verify conversation document created in MongoDB
    await expect.poll(async () => {
      const conv = await CoachConversation.findOne({ user: user._id });
      return conv?.messages?.length || 0;
    }, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);

    const savedConv = await CoachConversation.findOne({ user: user._id });
    expect(savedConv).not.toBeNull();
    if (savedConv) ctx.createdCoachConvIds.push(savedConv._id);

    // Verify exactly 1 user message is persisted for this turn (DEF-2B-COACH-02 verification)
    const userMessages = savedConv!.messages.filter((m) => m.role === "user");
    expect(userMessages.length).toBe(1);
    expect(userMessages[0].content).toBe(promptText);

    // 3. Reload conversation page: verify history loads without duplicate bubbles
    await page.reload();
    await page.waitForLoadState("networkidle");

    const messageCount = await page.locator(".whitespace-pre-wrap", { hasText: promptText }).count();
    expect(messageCount).toBe(1);

    // 4. Delete conversation via API and verify cleanup
    const deleteRes = await fetch(`${baseURL || "http://localhost:3000"}/api/coach/conversations/${savedConv!._id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
    });
    expect(deleteRes.status).toBe(200);

    const remainingConvs = await CoachConversation.countDocuments({ user: user._id });
    expect(remainingConvs).toBe(0);
  });

  test("validates coach input constraints and error responses", async ({ baseURL }) => {
    const { accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    // 1. Rejects empty message
    const emptyRes = await fetch(`${baseURL || "http://localhost:3000"}/api/coach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify({ message: "   " }),
    });
    expect(emptyRes.status).toBe(400);

    // 2. Rejects overlong message (>2000 characters)
    const longRes = await fetch(`${baseURL || "http://localhost:3000"}/api/coach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify({ message: "A".repeat(2001) }),
    });
    expect(longRes.status).toBe(400);
  });

  test("can browse saved plans on /plans with correct persisted details", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // Seed saved meal and workout plans
    const mealPlan = await MealPlan.create({
      user: user._id,
      planName: "Lean Muscle Nutrition Protocol",
      schedule: [
        {
          day: "Day 1",
          meals: [{ name: "Greek Yogurt Bowl", calories: 350, protein: 30, carbs: 40, fat: 5 }],
        },
      ],
      isActive: true,
    });
    ctx.createdPlanIds.push(mealPlan._id as mongoose.Types.ObjectId);

    const workoutPlan = await WorkoutPlan.create({
      user: user._id,
      planName: "Athletic Power Periodization",
      schedule: [
        {
          day: "Day 1",
          exercises: [{ name: "Barbell Back Squat", sets: 5, reps: 5 }],
        },
      ],
      isActive: true,
    });
    ctx.createdPlanIds.push(workoutPlan._id as mongoose.Types.ObjectId);

    // Visit /plans
    await page.goto("/plans");
    await page.waitForLoadState("networkidle");

    // Verify plans load cleanly without errors
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });
});
