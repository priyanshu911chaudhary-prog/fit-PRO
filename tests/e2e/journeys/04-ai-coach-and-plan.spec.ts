import { test, expect } from "@playwright/test";
import { createVerifiedE2EUser, injectAuthSession, cleanupE2EUser } from "../e2e-helpers";

test.describe("E2E Journey 4: AI Fitness Coach Conversation & Workouts", () => {
  let userSession: { userId: string; email: string; fullName: string };

  test.afterEach(async () => {
    if (userSession?.userId) {
      await cleanupE2EUser(userSession.userId);
    }
  });

  test("loads AI Coach stream interface and displays interactive prompt suggestions", async ({ page, context }) => {
    const user = await createVerifiedE2EUser({ withProfile: true, prefix: "ai_coach_journey" });
    userSession = user;
    await injectAuthSession(context, user);

    await page.goto("/coach");
    await page.waitForLoadState("domcontentloaded");

    // Verify AI coach welcome greeting
    await expect(page.locator("body")).toContainText(/AI Fitness Coach/i, { timeout: 15000 });

    // Verify chat input is ready
    const chatInput = page.locator("textarea, input[placeholder*='message'], input[placeholder*='Ask']").first();
    await expect(chatInput).toBeVisible();

    // Verify prompt suggestion pills exist
    const promptSuggestion = page.locator("button, div").filter({ hasText: /pull-up|protein|rest days|hydration/i }).first();
    await expect(promptSuggestion).toBeVisible();
  });
});
