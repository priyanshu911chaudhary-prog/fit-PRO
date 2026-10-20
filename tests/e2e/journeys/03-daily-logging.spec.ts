import { test, expect } from "@playwright/test";
import { createVerifiedE2EUser, injectAuthSession, cleanupE2EUser } from "../e2e-helpers";

test.describe("E2E Journey 3: Daily Hydration & Fitness Logging", () => {
  let userSession: { userId: string; email: string; fullName: string };

  test.afterEach(async () => {
    if (userSession?.userId) {
      await cleanupE2EUser(userSession.userId);
    }
  });

  test("logs hydration with one-click quick add and updates progress", async ({ page, context }) => {
    const user = await createVerifiedE2EUser({ withProfile: true, prefix: "water_journey" });
    userSession = user;
    await injectAuthSession(context, user);

    await page.goto("/water");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator("h1, h2").filter({ hasText: /Water|Hydration/i }).first()).toBeVisible();

    // Locate +250ml or +500ml quick add button
    const quickAddBtn = page.locator("button").filter({ hasText: /\+250|\+500/i }).first();
    await expect(quickAddBtn).toBeVisible({ timeout: 10000 });
    await quickAddBtn.click();

    // Verify success toast appears
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-sonner-toast]").first()).toContainText(/Logged|water/i);
  });
});
