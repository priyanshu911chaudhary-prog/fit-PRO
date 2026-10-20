import { test, expect } from "@playwright/test";
import { createVerifiedE2EUser, cleanupE2EUser } from "../e2e-helpers";

test.describe("E2E Journey 1: Authentication & Session Lifecycle", () => {
  let userSession: { userId: string; email: string; fullName: string };

  test.afterEach(async () => {
    if (userSession?.userId) {
      await cleanupE2EUser(userSession.userId);
    }
  });

  test("validates login page elements and handles invalid credentials gracefully", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("h2, .text-2xl").filter({ hasText: /Sign In|Welcome Back/i })).toBeVisible();
    await expect(page.locator("#email, input[type='email']")).toBeVisible();
    await expect(page.locator("#password, input[type='password']")).toBeVisible();

    // Attempt login with invalid credentials
    await page.fill("#email, input[type='email']", "nonexistent@fitpro.dev");
    await page.fill("#password, input[type='password']", "WrongPassword123!");
    await page.click("#login-submit-btn, button[type='submit']");

    // Must show toast or error indicator without crashing
    await expect(page.locator("[data-sonner-toast], [role='alert'], .text-rose-500").first()).toBeVisible({ timeout: 5000 });
  });

  test("authenticates verified user and redirects with secure session cookies", async ({ page }) => {
    // Generate verified test user
    const user = await createVerifiedE2EUser({ withProfile: false, prefix: "auth_journey" });
    userSession = user;

    await page.goto("/login");
    await page.fill("#email, input[type='email']", user.email);
    await page.fill("#password, input[type='password']", "Password123!");
    await page.click("#login-submit-btn, button[type='submit']");

    // User without profile redirects to /onboarding
    await expect(page).toHaveURL(/.*onboarding|.*dashboard/, { timeout: 15000 });

    // Verify session cookies are set
    const cookies = await page.context().cookies();
    const accessCookie = cookies.find((c) => c.name === "accessToken");
    expect(accessCookie).toBeDefined();
    expect(accessCookie?.httpOnly).toBe(true);
  });
});
