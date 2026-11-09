import dotenv from "dotenv";
import path from "path";
import { defineConfig, devices } from "@playwright/test";
import { assertSafeTestDatabase } from "../helpers/db-guard";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Safety guard: Enforce dedicated test database before allowing any E2E tests to run
const safeTestUri = assertSafeTestDatabase(process.env.MONGODB_URI_TEST);

export default defineConfig({
  testDir: "./journeys",
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1, // Sequential execution prevents cross-journey database collisions
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "playwright-artifacts",
  use: {
    baseURL: process.env.APP_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  webServer: {
    command: "npx next dev -p 3000",
    cwd: path.resolve(__dirname, "../../"),
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      PORT: "3000",
      APP_URL: "http://localhost:3000",
      MONGODB_URI: safeTestUri,
      MONGO_URI: safeTestUri,
      EMAIL_PROVIDER: "mock",
      AI_PROVIDER_MOCK: "true",
    },
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
