import dotenv from "dotenv";
import path from "path";
import { assertSafeTestDatabase } from "./helpers/db-guard";

// Load environment variables from root .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Force test environment
(process.env as Record<string, string | undefined>).NODE_ENV = "test";

// Enforce strict test database safety guard
const testUri = process.env.MONGODB_URI_TEST;
const safeUri = assertSafeTestDatabase(testUri);

// Override any generic MONGODB_URI to guarantee test DB isolation
process.env.MONGODB_URI = safeUri;
process.env.MONGO_URI = safeUri;

// Ensure test JWT secrets meet minimum length requirements
if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
  process.env.ACCESS_TOKEN_SECRET = "quality_tests_access_token_secret_min_32_chars!!";
}
if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 32) {
  process.env.REFRESH_TOKEN_SECRET = "quality_tests_refresh_token_secret_min_32_chars!";
}
if (!process.env.APP_URL) {
  process.env.APP_URL = "http://localhost:3000";
}
