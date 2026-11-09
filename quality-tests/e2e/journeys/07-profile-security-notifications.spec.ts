import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { setAuthCookies, loginViaUI } from "../fixtures/auth-helpers";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";
import { Notification } from "@/models/notification";
import { NotificationPreferences } from "@/models/notificationPreferences";

test.describe("Journey 07: Profile, Security, and Notification Settings", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("can update biometric profile fields and verify persistence across reload", async ({ page, context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // 1. Visit /profile
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // 2. Update weight via PATCH /api/profile
    const updateRes = await fetch(`${baseURL || "http://localhost:3000"}/api/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify({
        weight: 84,
        activityLevel: "very_active",
      }),
    });
    expect(updateRes.status).toBe(200);

    // 3. Reload page and assert persisted values
    await page.reload();
    await page.waitForLoadState("networkidle");

    const updatedProfile = await Profile.findOne({ user: user._id });
    expect(updatedProfile?.weight).toBe(84);
    expect(updatedProfile?.activityLevel).toBe("very_active");
  });

  test("can change password, login with new credentials, and audit session invalidation behavior", async ({ page, context, baseURL }) => {
    const originalPassword = "InitialPassword123!@";
    const newPassword = "UpdatedSecurePassword456!@";
    const { user, accessToken, refreshToken } = await ctx.createTestUser({
      password: originalPassword,
      hasProfile: true,
    });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // 1. Visit /profile
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    // 2. Change password via security card inputs
    await page.locator("#oldPassword").fill(originalPassword);
    await page.locator("#newPassword").fill(newPassword);
    await page.locator("#confirmPassword").fill(newPassword);

    await page.locator("#change-password-btn").click();

    // Verify success toast
    await expect(page.getByText(/Security credentials updated successfully/i)).toBeVisible({ timeout: 10_000 });

    // 3. AUDIT check: Did change password invalidate active refresh tokens in MongoDB?
    // In src/app/api/auth/change-password/route.ts, it only updates user.password and does not clear refreshToken.
    const userDocAfter = await User.findById(user._id).select("+refreshToken +previousRefreshToken");
    const didInvalidateRefreshToken = !userDocAfter?.refreshToken;
    console.log(`[AUDIT EVIDENCE] Does POST /api/auth/change-password invalidate existing refreshToken? ${didInvalidateRefreshToken ? "YES" : "NO (tokens remain active until expiry/logout)"}`);

    // 4. Verify login with NEW password succeeds
    await context.clearCookies();
    await loginViaUI(page, user.email, newPassword);
    await page.waitForURL(/.*\/dashboard/, { timeout: 15_000 });

    // 5. Verify login with OLD password fails
    await context.clearCookies();
    await loginViaUI(page, user.email, originalPassword);
    const errorBanner = page.locator('[data-testid="auth-error-banner"]');
    await expect(errorBanner).toBeVisible({ timeout: 10_000 });
  });

  test("can save notification preferences and mark notifications as read", async ({ context, baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });
    await setAuthCookies(context, baseURL || "http://localhost:3000", accessToken, refreshToken);

    // 1. Update notification preferences via PATCH /api/notifications/preferences
    const patchRes = await fetch(`${baseURL || "http://localhost:3000"}/api/notifications/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify({
        timezone: "America/New_York",
        proactiveNudgesEnabled: true,
        categories: { hydration: true, workout: false, nutrition: true },
      }),
    });
    expect(patchRes.status).toBe(200);

    const savedPref = await NotificationPreferences.findOne({ user: user._id });
    expect(savedPref?.timezone).toBe("America/New_York");
    expect(savedPref?.proactiveNudgesEnabled).toBe(true);
    expect(savedPref?.categories.workout).toBe(false);

    // 2. Create an unread notification in MongoDB
    const notif = await Notification.create({
      user: user._id,
      type: "hydration_nudge",
      title: "Hydration Check-in",
      body: "Time to drink 250ml water to maintain baseline.",
      category: "hydration",
      destinationUrl: "/water",
    });
    ctx.createdNotificationIds.push(notif._id);

    // 3. Mark notification as read via API
    const readRes = await fetch(`${baseURL || "http://localhost:3000"}/api/notifications/${notif._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify({ clicked: true }),
    });
    expect(readRes.status).toBe(200);

    const updatedNotif = await Notification.findById(notif._id);
    expect(updatedNotif?.readAt).not.toBeNull();
    expect(updatedNotif?.clickedAt).not.toBeNull();
  });

  test("unsubscribe token validation rejects invalid signatures deterministically", async ({ baseURL }) => {
    const invalidToken = "invalid_tampered_unsubscribe_token_string";
    const res = await fetch(`${baseURL || "http://localhost:3000"}/api/notifications/unsubscribe?token=${invalidToken}`, {
      headers: {
        Accept: "application/json",
      },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toMatch(/Invalid|expired|malformed/i);
  });
});
