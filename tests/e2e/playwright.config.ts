import dotenv from "dotenv";
import path from "path";
import { defineConfig, devices } from "@playwright/test";
import { assertSafeTestDatabase } from "../helpers/db-guard";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Safety guard: Enforce dedicated test database before allowing any E2E tests to run
const safeTestUri = assertSafeTestDatabase(process.env.MONGODB_URI_TEST);

const baseURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./journeys",
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1, // Sequential execution prevents cross-journey database collisions
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(__dirname, "playwright-report"), open: "never" }],
  ],
  outputDir: path.join(__dirname, "playwright-artifacts"),
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 60_000,
  },
  webServer: {
    command: "npm run seed && npx next dev -H 127.0.0.1 -p 3100",
    cwd: path.resolve(__dirname, "../../"),
    url: baseURL + "/login",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NODE_ENV: "development",
      APP_URL: baseURL,
      GEMINI_API_KEY: "",
      GOOGLE_CLIENT_ID: "",
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "",
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