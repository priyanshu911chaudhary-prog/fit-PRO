import dotenv from "dotenv";
import webpush from "web-push";
import { assertSafeTestDatabase } from "./helpers/db-guard";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Ensure test environment
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

const testUri = assertSafeTestDatabase(process.env.MONGODB_URI_TEST);
process.env.MONGODB_URI = testUri;
process.env.MONGO_URI = testUri;
process.env.EMAIL_PROVIDER = "mock";
const keys = webpush.generateVAPIDKeys();
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = keys.publicKey;
process.env.VAPID_PRIVATE_KEY = keys.privateKey;
if (!process.env.ACCESS_TOKEN_SECRET) {
  process.env.ACCESS_TOKEN_SECRET = "test_access_token_secret_32_chars_long_minimum!!";
}
if (!process.env.REFRESH_TOKEN_SECRET) {
  process.env.REFRESH_TOKEN_SECRET = "test_refresh_token_secret_32_chars_long_minimum!";
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = "redis://127.0.0.1:6379";
}

// If running in DOM environment, import jest-dom matchers
if (typeof window !== "undefined") {
  try {
    require("@testing-library/jest-dom");
  } catch {
    // optional matchers
  }
}
