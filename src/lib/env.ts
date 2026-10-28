import { z } from "zod";
import { logger } from "@/lib/logger";

// Normalise MongoDB URI alias
if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
  process.env.MONGODB_URI = process.env.MONGO_URI;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_URI_TEST: z.string().optional(),
  ACCESS_TOKEN_SECRET: z.string().min(16, "ACCESS_TOKEN_SECRET must be at least 16 characters"),
  ACCESS_TOKEN_EXPIRATION: z.string().default("15m"),
  REFRESH_TOKEN_SECRET: z.string().min(16, "REFRESH_TOKEN_SECRET must be at least 16 characters"),
  REFRESH_TOKEN_EXPIRATION: z.string().default("7d"),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MAILTRAP_API_TOKEN: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["mailtrap", "mock"]).default("mock"),
  EMAIL_FROM: z.string().default("Fit-PRO <hello@fit-pro.publicvm.com>"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z
    .string()
    .default("BPKkV4JKJiqgsTNdGFL318UX_TzjvRIV5BFmSdnPtS5IrN9o6u1g5Ea8opRm9n0htPbUhPzXyVnCQevmjSN7CI4"),
  VAPID_PRIVATE_KEY: z
    .string()
    .default("xjmJTDNSlC7ot51P25s8w-EDi0xzrarcJ5SR2xN3rDs"),
  VAPID_SUBJECT: z.string().default("mailto:support@fitpro.local"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

export function getEnv(): Env {
  if (parsedEnv) return parsedEnv;

  if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
    process.env.MONGODB_URI = process.env.MONGO_URI;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // In production runtime or when server starts, fail fast
    if (process.env.NODE_ENV === "production" && !process.env.NEXT_PHASE) {
      if (process.env.EMAIL_PROVIDER === "mailtrap" && !process.env.MAILTRAP_API_TOKEN) {
        throw new Error("Environment validation failed: MAILTRAP_API_TOKEN is required when EMAIL_PROVIDER is mailtrap in production");
      }
      logger.error("Environment validation failed", {
        event: "config.validation.failed",
        issueCount: result.error.issues.length,
        issues: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          code: issue.code,
        })),
      });
      throw new Error(`Environment validation failed:\n${errorDetails}`);
    }

    // In development or build phase, fallback with warning
    logger.warn("Environment variables missing or invalid", {
      event: "config.validation.warning",
      issueCount: result.error.issues.length,
      issues: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: issue.code,
      })),
    });

    // Provide safe defaults for build/development if missing
    parsedEnv = {
      NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
      APP_URL: process.env.APP_URL || "http://localhost:3000",
      MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fit-pro",
      ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || "default_dev_access_token_secret_12345",
      ACCESS_TOKEN_EXPIRATION: process.env.ACCESS_TOKEN_EXPIRATION || "15m",
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "default_dev_refresh_token_secret_12345",
      REFRESH_TOKEN_EXPIRATION: process.env.REFRESH_TOKEN_EXPIRATION || "7d",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
      MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
      MAILTRAP_API_TOKEN: process.env.MAILTRAP_API_TOKEN,
      EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER as "mailtrap" | "mock") || (process.env.MAILTRAP_API_TOKEN ? "mailtrap" : "mock"),
      EMAIL_FROM: process.env.EMAIL_FROM || "Fit-PRO <hello@fit-pro.publicvm.com>",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY:
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        "BPKkV4JKJiqgsTNdGFL318UX_TzjvRIV5BFmSdnPtS5IrN9o6u1g5Ea8opRm9n0htPbUhPzXyVnCQevmjSN7CI4",
      VAPID_PRIVATE_KEY:
        process.env.VAPID_PRIVATE_KEY || "xjmJTDNSlC7ot51P25s8w-EDi0xzrarcJ5SR2xN3rDs",
      VAPID_SUBJECT: process.env.VAPID_SUBJECT || "mailto:support@fitpro.local",
    };
    return parsedEnv;
  }

  parsedEnv = result.data;
  return parsedEnv;
}

export const env = getEnv();
