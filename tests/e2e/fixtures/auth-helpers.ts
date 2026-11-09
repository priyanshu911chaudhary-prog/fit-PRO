import { Page, BrowserContext, expect } from "@playwright/test";

export async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");

  // Ensure login tab is active
  const loginEmailInput = page.locator("#login-email").first();
  await expect(loginEmailInput).toBeVisible({ timeout: 10_000 });

  await loginEmailInput.fill(email);
  await page.locator("#login-password").first().fill(password);
  await page.locator("#login-submit-btn").first().click();
}

export async function registerViaUI(
  page: Page,
  name: string,
  email: string,
  password: string
): Promise<void> {
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("domcontentloaded");

  const nameInput = page.locator("#register-name").first();
  await expect(nameInput).toBeVisible({ timeout: 10_000 });

  await nameInput.fill(name);
  await page.locator("#register-email").first().fill(email);
  await page.locator("#register-password").first().fill(password);
  await page.locator("#confirmPassword").first().fill(password);
  await page.locator("#agreeTerms").first().check();

  await page.locator("#register-submit-btn").first().click();
}

export async function completeOnboardingViaUI(page: Page): Promise<void> {
  // Step 1: Biometrics -> Continue
  const continueBtn = page.getByRole("button", { name: "Continue" });
  await expect(continueBtn).toBeVisible({ timeout: 10_000 });
  await continueBtn.click();

  // Step 2: Goals -> Continue
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: Equipment -> Continue
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 4: Calibration -> Launch Athlete Dashboard
  const launchBtn = page.getByRole("button", { name: /Launch Athlete Dashboard/i });
  await expect(launchBtn).toBeVisible({ timeout: 10_000 });
  await launchBtn.click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

export async function setAuthCookies(
  context: BrowserContext,
  baseURL: string,
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  const url = new URL(baseURL);
  const domain = url.hostname;

  const cookies = [
    {
      name: "accessToken",
      value: accessToken,
      domain,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ];

  if (refreshToken) {
    cookies.push({
      name: "refreshToken",
      value: refreshToken,
      domain,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    });
  }

  await context.addCookies(cookies);
}
