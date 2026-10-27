import Redis, { RedisOptions } from "ioredis";
import { logger } from "@/lib/logger";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/**
 * Returns connection options configured strictly for BullMQ.
 * CRITICAL: maxRetriesPerRequest MUST be null for BullMQ workers and queues.
 * enableOfflineQueue is enabled so commands can be queued while reconnecting.
 */
export function getBullMQConnectionOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    disconnectTimeout: 5000,
    retryStrategy(times: number) {
      // Exponential backoff capped at 3 seconds
      return Math.min(times * 100, 3000);
    },
    reconnectOnError(err: Error) {
      const targetErrors = ["READONLY", "ETIMEDOUT", "ECONNRESET"];
      if (targetErrors.some((target) => err.message.includes(target))) {
        return true;
      }
      return false;
    },
  };
}

/**
 * Creates an independent Redis client for BullMQ usage.
 */
export function createBullMQConnection(customOptions?: Partial<RedisOptions>): Redis {
  const options: RedisOptions = {
    ...getBullMQConnectionOptions(),
    ...customOptions,
    // Enforce maxRetriesPerRequest: null regardless of overrides
    maxRetriesPerRequest: null,
  };

  const client = new Redis(REDIS_URL, options);

  client.on("error", (error: Error) => {
    logger.error("BullMQ Redis connection error", {
      error: error.message,
    });
  });

  return client;
}
