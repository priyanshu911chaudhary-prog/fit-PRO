
import Redis from "ioredis";
import { ApiError } from "./api-error";
import { logger } from "../logger";

export interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  identifier?: string;
  message?: string;
}

/**
 * Derive the client IP from trusted proxy headers.
 * Raw x-forwarded-for is only accepted outside production.
 */
export function getTrustedClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  if (process.env.NODE_ENV !== "production") {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
  }

  return "127.0.0.1";
}

// One Redis client per Node.js process.
const redis = new Redis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  }
);

let connectionPromise: Promise<void> | null = null;

redis.on("error", (error: Error) => {
  logger.error("Redis rate limiter connection error", {
    error: error.message,
  });
});

async function ensureRedisConnected(): Promise<void> {
  if (redis.status === "ready") return;

  if (!connectionPromise) {
    connectionPromise = redis.connect().finally(() => {
      connectionPromise = null;
    });
  }

  await connectionPromise;
}

/**
 * Atomically increment a counter and initialize its expiry.
 * PTTL gives the remaining window duration in milliseconds.
 */
const INCREMENT_SCRIPT = `
  local count = redis.call("INCR", KEYS[1])
  local ttl = redis.call("PTTL", KEYS[1])

  if count == 1 or ttl < 0 then
    redis.call("PEXPIRE", KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
  end

  return { count, ttl }
`;

export async function checkRateLimit(
  req: Request,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; reset: Date }> {
  const ip = getTrustedClientIp(req);
  const id = options.identifier || ip;
  const key = `rate-limit:${options.keyPrefix}:${id}`;
  const windowMs = options.windowSeconds * 1000;
  const fallbackReset = new Date(Date.now() + windowMs);

  try {
    await ensureRedisConnected();

    const result = (await redis.eval(
      INCREMENT_SCRIPT,
      1,
      key,
      String(windowMs)
    )) as [number, number];

    const [count, ttlMs] = result;
    const reset = new Date(Date.now() + Math.max(0, ttlMs));

    if (count > options.limit) {
      const waitSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      const customMessage =
        options.message ||
        `Too many requests. Please try again after ${waitSeconds} seconds.`;

      throw new ApiError(429, customMessage, [
        `Rate limit exceeded: max ${options.limit} requests per ${options.windowSeconds}s`,
      ]);
    }

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - count),
      reset,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Preserve the existing fail-open behavior if the rate-limit
    // store is unavailable. Revisit this policy for sensitive routes.
    logger.error("Rate limiter Redis check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      allowed: true,
      remaining: 1,
      reset: fallbackReset,
    };
  }
}
