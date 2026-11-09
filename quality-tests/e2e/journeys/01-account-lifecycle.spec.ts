import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { registerViaUI, loginViaUI, completeOnboardingViaUI } from "../fixtures/auth-helpers";
import { User } from "@/models/user";
import { Profile } from "@/models/profile";

test.describe("Journey 01: Account and First-Use Lifecycle", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("can register, verify email via outbox token, complete onboarding, and reach dashboard", async ({ page }) => {
    const email = ctx.createTestEmail("athlete");
    const name = "Alex Runner";
    const password = "StrongTestPassword123!@";

    // 1. Register through UI
    await registerViaUI(page, name, email, password);

    // Should redirect to login with registered query param
    await expect(page).toHaveURL(/.*\/login\?registered=1/, { timeout: 15_000 });

    // Track user in context for cleanup
    const dbUser = await User.findOne({ email });
    expect(dbUser).not.toBeNull();
    if (dbUser) ctx.createdUserIds.push(dbUser._id);
    expect(dbUser?.isVerified).toBe(false);

    // 2. Negative test: Attempt to login before email is verified
    await loginViaUI(page, email, password);
    const errorBanner = page.locator('[data-testid="auth-error-banner"]');
    await expect(errorBanner).toBeVisible({ timeout: 10_000 });
    await expect(errorBanner).toContainText(/Email not verified/i);

    // 3. Extract verification token from durable test outbox
    const verificationData = await ctx.extractVerificationToken(email);
    expect(verificationData).not.toBeNull();
    expect(verificationData?.token).toBeTruthy();

    // 4. Visit verification link in browser
    await page.goto(`/verify-email/${verificationData?.token}`);
    await expect(page.getByText(/Email Verified!/i).first()).toBeVisible({ timeout: 15_000 });

    // Click continue to sign in
    const continueBtn = page.getByRole("button", { name: /Continue to Sign In/i });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();
    await expect(page).toHaveURL(/.*\/login\?verified=1/);

    // Verify DB user is now verified
    const verifiedUser = await User.findOne({ email });
    expect(verifiedUser?.isVerified).toBe(true);
    expect(verifiedUser?.emailVerificationToken).toBeFalsy();

    // 5. Login with verified account
    await loginViaUI(page, email, password);

    // 6. User has no profile, must be redirected to /onboarding
    await expect(page).toHaveURL(/.*\/onboarding/, { timeout: 15_000 });

    // 7. Complete onboarding wizard steps
    await completeOnboardingViaUI(page);

    // 8. Land on /dashboard with active profile
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15_000 });

    // Verify DB profile persistence
    const savedProfile = await Profile.findOne({ user: verifiedUser?._id });
    expect(savedProfile).not.toBeNull();
    if (savedProfile) ctx.createdProfileIds.push(savedProfile._id);
    expect(savedProfile?.isProfileComplete).toBe(true);
    expect(savedProfile?.height).toBeGreaterThan(0);
    expect(savedProfile?.weight).toBeGreaterThan(0);
  });

  test("enforces session restoration, route protection, and logout invalidation", async ({ page, context }) => {
    // Create an active onboarded user
    const { user, password } = await ctx.createTestUser({ hasProfile: true });

    // 1. Visit /dashboard unauthenticated -> should redirect to login
    await context.clearCookies();
    await page.goto("/dashboard");
    await page.waitForURL(/.*\/login/, { timeout: 15_000 });
    expect(page.url()).toContain("redirect=");

    // 2. Login through UI
    await loginViaUI(page, user.email, password);
    await page.waitForURL(/.*\/dashboard/, { timeout: 15_000 });

    // 3. Authenticated user visiting /login gets redirected to /dashboard
    await page.goto("/login");
    await page.waitForURL(/.*\/dashboard/, { timeout: 15_000 });

    // 4. Authenticated user visiting /onboarding gets redirected to /dashboard
    await page.goto("/onboarding");
    await page.waitForURL(/.*\/dashboard/, { timeout: 15_000 });

    // 5. Logout
    const logoutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout-btn"]');
    if (await logoutBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.first().click();
    } else {
      // Trigger logout via API endpoint from browser context
      await page.evaluate(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
      });
      await page.goto("/login");
    }

    await page.waitForURL(/.*\/login/, { timeout: 15_000 });

    // 6. Post-logout protected page access is denied
    await page.goto("/dashboard");
    await page.waitForURL(/.*\/login/, { timeout: 15_000 });
  });

  test("fails closed safely at OAuth callback boundary without valid state", async ({ page }) => {
    // Access Google OAuth callback with missing state parameter
    await page.goto("/api/auth/google/callback?code=mock_code");
    await page.waitForURL(/.*\/login\?error=.*OAuth\+state/, { timeout: 15_000 });

    // Access Microsoft OAuth callback with missing state parameter
    await page.goto("/api/auth/microsoft/callback?code=mock_code");
    await page.waitForURL(/.*\/login\?error=.*/, { timeout: 15_000 });
  });
});

