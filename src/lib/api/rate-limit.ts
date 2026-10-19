import mongoose from "mongoose";
import { connectDB } from "../db";
import { ApiError } from "./api-error";

interface IRateLimit {
  key: string;
  count: number;
  expiresAt: Date;
}

const rateLimitSchema = new mongoose.Schema<IRateLimit>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 1 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: false }
);

export const RateLimit =
  mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", rateLimitSchema);
const RateLimitModel = RateLimit;

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  identifier?: string;
  message?: string;
}

/**
 * Derive trusted client IP:
 * - On Vercel: `x-vercel-forwarded-for` is injected by the Vercel edge network and cannot be spoofed by clients.
 * - On standard edge proxies: `x-real-ip` is set by the terminating reverse proxy.
 * - In production: Raw client-supplied `x-forwarded-for` is NEVER trusted to prevent header-rotation bypass.
 * - In development/test: `x-forwarded-for` is permitted solely for local testing and test suite simulation.
 */
export function getTrustedClientIp(req: Request): string {
  // 1. Platform-trusted header on Vercel
  const vercelIp = req.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  // 2. Terminating reverse-proxy header
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // 3. Fallback only permitted in non-production environments
  if (process.env.NODE_ENV !== "production") {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
  }

  return "127.0.0.1";
}

export async function checkRateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  await connectDB();

  const ip = getTrustedClientIp(req);
  const id = options.identifier || ip;
  const key = `${options.keyPrefix}:${id}`;
  const now = new Date();
  const reset = new Date(Date.now() + options.windowSeconds * 1000);

  try {
    // 1. Try atomic increment on an existing active window (compares timestamp itself, zero TTL dependency)
    const active = await RateLimitModel.findOneAndUpdate(
      { key, expiresAt: { $gt: now } },
      { $inc: { count: 1 } },
      { returnDocument: "after" }
    );

    if (active) {
      if (active.count > options.limit) {
        const waitSeconds = Math.max(1, Math.ceil((active.expiresAt.getTime() - now.getTime()) / 1000));
        const customMessage =
          options.message || `Too many requests. Please try again after ${waitSeconds} seconds.`;
        throw new ApiError(429, customMessage, [
          `Rate limit exceeded: max ${options.limit} requests per ${options.windowSeconds}s`,
        ]);
      }

      return {
        allowed: true,
        remaining: Math.max(0, options.limit - active.count),
        reset: active.expiresAt,
      };
    }

    // 2. If no active window exists (either doc not found or window expired), atomically reset/upsert
    const resetRecord = await RateLimitModel.findOneAndUpdate(
      { key },
      { $set: { count: 1, expiresAt: reset } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - 1),
      reset: resetRecord.expiresAt,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // If rate limit collection query fails, log and allow request through to prevent service denial
    console.error("Rate limiter database check error:", error);
    return { allowed: true, remaining: 1, reset };
  }
}
