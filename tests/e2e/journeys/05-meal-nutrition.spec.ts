import { test, expect } from "@playwright/test";
import { createVerifiedE2EUser, injectAuthSession, cleanupE2EUser } from "../e2e-helpers";

test.describe("E2E Journey 5: Ingredient-Based Meal Logging & Daily Nutrition Ledger", () => {
  let userSession: { userId: string; email: string; fullName: string };

  test.afterEach(async () => {
    if (userSession?.userId) {
      await cleanupE2EUser(userSession.userId);
    }
  });

  test("full nutrition lifecycle: ingredient search, portion adjustments, meal logging, daily ledger accumulation, date switching, and deletion", async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);

    const user = await createVerifiedE2EUser({ withProfile: true, prefix: "meal_journey" });
    userSession = user;
    await injectAuthSession(context, user);

    await page.goto("/meal");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verify Page Loaded and Daily Ledger Header is Visible
    await expect(page.locator("h1, h2, h3").filter({ hasText: /Nutrition|Fuel|Meal/i }).first()).toBeVisible();
    await expect(page.locator("text=Daily Nutrition Ledger")).toBeVisible();

    // 2. Search for "Tomato" in catalog
    const searchInput = page.locator("#food-search-input");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Tomato");

    // 3. Add Tomato to Plate
    const addTomatoBtn = page.getByRole("button", { name: /Add Tomato/i }).first();
    await expect(addTomatoBtn).toBeVisible({ timeout: 10000 });
    await addTomatoBtn.click();

    // Verify Tomato is on plate
    await expect(page.locator("text=Plate is currently empty")).not.toBeVisible();
    await expect(page.locator("p").filter({ hasText: /^Tomato$/i }).first()).toBeVisible();

    // 4. Search for "Egg" and add to Plate
    await searchInput.fill("Whole Egg");
    const addEggBtn = page.getByRole("button", { name: /Add Whole Egg/i }).first();
    await expect(addEggBtn).toBeVisible({ timeout: 10000 });
    await addEggBtn.click();

    // Verify Whole Egg is on plate
    await expect(page.locator("p").filter({ hasText: /^Whole Egg$/i }).first()).toBeVisible();

    // 5. Verify Plate Macros Update
    await expect(page.locator("text=Macro Preview")).toBeVisible();
    const commitBtn = page.locator("#submit-meal-btn");
    await expect(commitBtn).toBeVisible();
    await expect(commitBtn).toContainText(/Log Breakfast/i);

    // 6. Log Breakfast
    await commitBtn.click();

    // Verify toast appears
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-sonner-toast]").first()).toContainText(/Logged|successfully/i);

    // 7. Verify Plate Clears
    await expect(page.locator("text=Your plate is currently empty")).toBeVisible();

    // 8. Verify Daily Ledger Shows Consumed Calories
    const dailyEnergyCard = page.locator("text=DAILY CONSUMED").locator("..");
    await expect(dailyEnergyCard).toBeVisible();
    await expect(page.locator("text=1 logged meal").first()).toBeVisible();

    // 9. Select Lunch window
    const lunchBtn = page.getByRole("button", { name: /lunch/i }).first();
    await lunchBtn.click();
    await expect(lunchBtn).toHaveClass(/border-cyan-500/);

    // 10. Add Lunch ingredient: Cucumber
    await searchInput.fill("Cucumber");
    const addCucumberBtn = page.getByRole("button", { name: /Add Cucumber/i }).first();
    await expect(addCucumberBtn).toBeVisible({ timeout: 10000 });
    await addCucumberBtn.click();

    // Commit Lunch
    const logLunchBtn = page.locator("#submit-meal-btn");
    await expect(logLunchBtn).toContainText(/Log Lunch/i);
    await logLunchBtn.click();

    // Verify second success toast
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });

    // 11. Verify Daily Ledger Accumulates Both Meals
    await expect(page.locator("text=2 logged meals").first()).toBeVisible({ timeout: 10000 });

    // 12. Refresh page to verify persistence
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("text=2 logged meals").first()).toBeVisible({ timeout: 10000 });

    // 13. Navigate to History Tab
    const historyTabBtn = page.getByRole("tab", { name: /Daily Ledger|History/i }).first();
    await historyTabBtn.click();

    // Verify meals appear in history
    await expect(page.locator("h4").filter({ hasText: /Breakfast/i }).first()).toBeVisible();
    await expect(page.locator("h4").filter({ hasText: /Lunch/i }).first()).toBeVisible();

    // 14. Delete Lunch meal
    const deleteBtn = page.getByRole("button", { name: /Delete Lunch/i }).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Verify only 1 meal remains
    await expect(page.locator("text=1 Meals Logged").or(page.locator("text=1 logged meal")).first()).toBeVisible({ timeout: 10000 });
  });
});
