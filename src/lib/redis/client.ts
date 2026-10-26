import Redis from "ioredis";
import { logger } from "../logger";

declare global {
  var __fitpro_redis_client__: Redis | undefined;
  var __fitpro_redis_conn_promise__: Promise<void> | null | undefined;
}

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/**
 * Returns the singleton Redis client for the current Node.js process.
 * Configured with lazy connection, bounded retries and timeouts for resilient request handling.
 */
export function getRedisClient(): Redis {
  if (global.__fitpro_redis_client__) {
    return global.__fitpro_redis_client__;
  }

  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 3000,
    retryStrategy: () => null, // Fail fast during request handling
  });

  client.on("error", (error: Error) => {
    logger.error("Redis client connection error", {
      error: error.message,
    });
  });

  global.__fitpro_redis_client__ = client;
  return client;
}

/**
 * Ensures the shared Redis client is in a connected/ready state.
 * Returns true if connected, false if unavailable.
 */
export async function ensureRedisConnected(client?: Redis): Promise<boolean> {
  const redis = client || getRedisClient();

  if (redis.status === "ready") {
    return true;
  }

  if (redis.status === "connecting" && global.__fitpro_redis_conn_promise__) {
    try {
      await global.__fitpro_redis_conn_promise__;
      return (redis.status as string) === "ready";
    } catch {
      return false;
    }
  }

  try {
    global.__fitpro_redis_conn_promise__ = redis.connect().finally(() => {
      global.__fitpro_redis_conn_promise__ = null;
    });
    await global.__fitpro_redis_conn_promise__;
    return true;
  } catch (error) {
    logger.warn("Redis connection could not be established; continuing with fallback", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Checks if Redis is currently connected and ready.
 */
export function isRedisReady(client?: Redis): boolean {
  const redis = client || global.__fitpro_redis_client__;
  return redis ? redis.status === "ready" : false;
}

/**
 * Closes and cleans up the shared Redis connection. Useful for tests and process shutdown.
 */
export async function closeRedisConnection(): Promise<void> {
  const client = global.__fitpro_redis_client__;
  if (client) {
    try {
      if (client.status === "ready" || client.status === "connecting") {
        await client.quit();
      } else {
        client.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    } finally {
      global.__fitpro_redis_client__ = undefined;
      global.__fitpro_redis_conn_promise__ = null;
    }
  }
}
