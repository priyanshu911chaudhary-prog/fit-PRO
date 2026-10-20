import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./journeys",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1, // Sequential execution prevents database race conditions
  reporter: [["list"], ["html", { outputFolder: "test-results/playwright-report", open: "never" }]],
  outputDir: "test-results/playwright-artifacts",
  use: {
    baseURL: process.env.APP_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
