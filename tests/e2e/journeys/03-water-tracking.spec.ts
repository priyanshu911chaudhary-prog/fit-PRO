import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { setAuthCookies } from "../fixtures/auth-helpers";
import { WaterLog } from "@/models/waterLog";

test.describe("Journey 03: Water Tracking and Hydration Lifecycle", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("can quick-add, custom-add, verify persistence, undo, and delete entries cleanly", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // 1. Visit /water
    await page.goto("/water");
    await page.waitForLoadState("networkidle");

    // Initially 0 ml
    await expect(page.locator("span.font-mono").filter({ hasText: /^0$/ })).toBeVisible({ timeout: 10_000 });

    // 2. Quick add +250 ml
    const add250Btn = page.getByRole("button", { name: /\+250 ml/i });
    await expect(add250Btn).toBeVisible({ timeout: 10_000 });
    await add250Btn.click();

    // Verify toast confirmation
    await expect(page.getByText(/\+250 ml Hydration Logged/i)).toBeVisible({ timeout: 10_000 });

    // Verify UI total updates to 250
    await expect(page.locator("span.font-mono").filter({ hasText: /^250$/ })).toBeVisible({ timeout: 10_000 });

    // Verify database record created
    const firstLog = await WaterLog.findOne({ user: user._id });
    expect(firstLog).not.toBeNull();
    if (firstLog) ctx.createdWaterLogIds.push(firstLog._id);
    expect(firstLog?.amountMl).toBe(250);

    // 3. Custom amount add: 350 ml
    const customInput = page.locator('input[type="number"][placeholder*="Amount"]');
    await expect(customInput).toBeVisible();
    await customInput.fill("350");

    const addCustomBtn = page.locator("#water-add-btn");
    await addCustomBtn.click();

    // Verify toast and new total: 250 + 350 = 600 ml
    await expect(page.getByText(/\+350 ml Hydration Logged/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("span.font-mono").filter({ hasText: /^600$/ })).toBeVisible({ timeout: 10_000 });

    const allLogs = await WaterLog.find({ user: user._id });
    expect(allLogs.length).toBe(2);
    for (const log of allLogs) ctx.createdWaterLogIds.push(log._id);

    // 4. Persistence check: Reload page and confirm 600 ml remains
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("span.font-mono").filter({ hasText: /^600$/ })).toBeVisible({ timeout: 10_000 });

    // 5. Undo last entry (reverses 350 ml -> back to 250 ml)
    const undoBtn = page.locator("#water-undo-btn");
    await expect(undoBtn).toBeEnabled({ timeout: 10_000 });
    await undoBtn.click();

    await expect(page.getByText(/Hydration log removed/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("span.font-mono").filter({ hasText: /^250$/ })).toBeVisible({ timeout: 10_000 });

    // 6. Delete remaining entry using the trash icon in the stream list
    const deleteBtn = page.getByRole("button", { name: "Delete water log" }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });
    await deleteBtn.click();

    await expect(page.getByText(/Hydration log removed/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("span.font-mono").filter({ hasText: /^0$/ })).toBeVisible({ timeout: 10_000 });

    // 7. Verify all water logs for this user were removed
    const remainingLogs = await WaterLog.countDocuments({ user: user._id });
    expect(remainingLogs).toBe(0);
  });

  test("rejects invalid amounts and enforces validation boundaries", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    await page.goto("/water");
    await page.waitForLoadState("networkidle");

    // Attempt to add negative or zero amount
    const customInput = page.locator('input[type="number"][placeholder*="Amount"]');
    await customInput.fill("-100");
    await page.locator("#water-add-btn").click();

    // Verify error toast
    await expect(page.getByText(/Amount must be between 1 and 5000/i)).toBeVisible({ timeout: 10_000 });

    // Ensure 0 records in database
    const count = await WaterLog.countDocuments({ user: user._id });
    expect(count).toBe(0);
  });
});
