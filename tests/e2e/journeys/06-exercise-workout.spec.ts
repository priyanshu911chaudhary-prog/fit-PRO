import { test, expect } from "@playwright/test";
import { createVerifiedE2EUser, injectAuthSession, cleanupE2EUser } from "../e2e-helpers";

test.describe("E2E Journey 6: Movement Catalog & Workout Session Logging", () => {
  let userSession: { userId: string; email: string; fullName: string };

  test.afterEach(async () => {
    if (userSession?.userId) {
      await cleanupE2EUser(userSession.userId);
    }
  });

  test("full workout lifecycle: catalog search, muscle filters, exercise addition, sets configuration, session submission, and history persistence", async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);

    const user = await createVerifiedE2EUser({ withProfile: true, prefix: "workout_journey" });
    userSession = user;
    await injectAuthSession(context, user);

    await page.goto("/workout");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verify Page Loaded and Movement Catalog is Visible
    await expect(page.locator("text=Movement Catalog")).toBeVisible();
    await expect(page.locator("text=available").first()).toBeVisible();

    // 2. Search for newly seeded exercise "Romanian Deadlift"
    const searchInput = page.getByPlaceholder(/Search bench press, squat, curl/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Romanian Deadlift");

    // 3. Add Romanian Deadlift (Barbell) to workout session
    const addRdlBtn = page.getByRole("button", { name: /Add Romanian Deadlift \(Barbell\) to workout/i }).first();
    await expect(addRdlBtn).toBeVisible({ timeout: 10000 });
    await addRdlBtn.click();

    // 4. Verify exercise added to session builder and HUD reflects 1 movement
    await expect(page.locator("text=Romanian Deadlift (Barbell)").first()).toBeVisible();
    await expect(page.locator("#hud-planned-exercises")).toContainText("1 movements");

    // 5. Apply Muscle Filter: Click "Chest" chip
    await searchInput.fill("");
    const chestChip = page.getByRole("button", { name: /^Chest$/i }).first();
    await expect(chestChip).toBeVisible();
    await chestChip.click();

    // 6. Search for "Bench Press" and add Dumbbell Bench Press
    await searchInput.fill("Dumbbell Bench Press");
    const addDbBenchBtn = page.getByRole("button", { name: /Add Dumbbell Bench Press to workout/i }).first();
    await expect(addDbBenchBtn).toBeVisible({ timeout: 10000 });
    await addDbBenchBtn.click();

    // Verify both exercises are in the session builder
    await expect(page.locator("text=Dumbbell Bench Press").first()).toBeVisible();
    await expect(page.locator("text=Romanian Deadlift (Barbell)").first()).toBeVisible();

    // Verify Day Total HUD aggregates across BOTH exercises: 2 distinct movements and 6 sets (3 sets each)
    await expect(page.locator("#hud-planned-exercises")).toContainText("2 movements");
    await expect(page.locator("#hud-total-sets")).toContainText("6 sets");

    // 7. Complete Session & Log Workout
    const submitBtn = page.locator("#submit-workout-btn");
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // 8. Verify success toast appears
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-sonner-toast]").first()).toContainText(/Logged|Saved|Workout/i);

    // 9. Switch to History tab and verify persisted workout
    const historyTab = page.getByRole("tab", { name: /Session History/i }).first();
    if (await historyTab.isVisible()) {
      await historyTab.click();
      await expect(page.locator("text=Romanian Deadlift (Barbell)").first()).toBeVisible({ timeout: 10000 });
    }

    // 10. Verify Day Total HUD retains committed values even after session is reset
    await page.getByRole("tab", { name: /Log Session/i }).first().click();
    await expect(page.locator("#hud-planned-exercises")).toContainText("2 movements");
    await expect(page.locator("#hud-total-sets")).toContainText("6 sets");

    // 11. Test Date Isolation: Navigate to previous day
    const prevDayBtn = page.getByRole("button", { name: /Previous day/i }).first();
    await prevDayBtn.click();
    // Prior day must be clean: 0 movements, 0 sets
    await expect(page.locator("#hud-planned-exercises")).toContainText("0 movements");
    await expect(page.locator("#hud-total-sets")).toContainText("0 sets");

    // 12. Return to Today and verify day totals restored
    const todayBtn = page.getByRole("button", { name: /Today/i }).first();
    await todayBtn.click();
    await expect(page.locator("#hud-planned-exercises")).toContainText("2 movements");
    await expect(page.locator("#hud-total-sets")).toContainText("6 sets");
  });
});
