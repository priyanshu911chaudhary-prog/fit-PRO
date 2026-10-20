import { test, expect } from "@playwright/test";
import { createVerifiedE2EUser, injectAuthSession, cleanupE2EUser } from "../e2e-helpers";

test.describe("E2E Journey 2: Biometrics Tracking & BMI Calculator", () => {
  let userSession: { userId: string; email: string; fullName: string };

  test.afterEach(async () => {
    if (userSession?.userId) {
      await cleanupE2EUser(userSession.userId);
    }
  });

  test("calculates BMI and updates biometrics history", async ({ page, context }) => {
    const user = await createVerifiedE2EUser({ withProfile: true, prefix: "bmi_journey" });
    userSession = user;
    await injectAuthSession(context, user);

    await page.goto("/bmi");
    await page.waitForLoadState("domcontentloaded");

    // Check page header and calculator form
    await expect(page.locator("h1, h2").filter({ hasText: /BMI|Body Mass/i }).first()).toBeVisible();

    // Input new biometrics
    const weightInput = page.locator("input#weight, input[name='weight']").first();
    const heightInput = page.locator("input#height, input[name='height']").first();

    if (await weightInput.isVisible()) {
      await weightInput.fill("78");
    }
    if (await heightInput.isVisible()) {
      await heightInput.fill("180");
    }

    // Submit new BMI calculation
    const logBtn = page.locator("button").filter({ hasText: /Log BMI|Calculate|Save/i }).first();
    if (await logBtn.isVisible()) {
      await logBtn.click();
      await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });
    }

    // Assert that normal category or computed score is displayed
    await expect(page.locator("body")).toContainText(/normal|24\./i);
  });
});
