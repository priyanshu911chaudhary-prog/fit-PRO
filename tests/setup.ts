import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Ensure test environment
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

// Normalise MongoDB URI key names across legacy and Next.js conventions
if (process.env.MONGODB_URI_TEST) {
  process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
  process.env.MONGO_URI = process.env.MONGODB_URI_TEST;
} else if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  process.env.MONGODB_URI = process.env.MONGO_URI;
}
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
