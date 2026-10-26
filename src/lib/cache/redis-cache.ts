import { getRedisClient, ensureRedisConnected } from "../redis/client";
import { logger } from "../logger";

export interface CacheResult<T> {
  data: T;
  hit: boolean;
}

/**
 * Gets the current integer version for a versioned namespace.
 * Falls back to 1 if Redis is unavailable or uninitialized.
 */
export async function getNamespaceVersion(namespace: string): Promise<number> {
  try {
    const redis = getRedisClient();
    const connected = await ensureRedisConnected(redis);
    if (!connected) return 1;

    const versionStr = await redis.get(`cache:v:${namespace}`);
    if (!versionStr) {
      return 1;
    }
    const parsed = parseInt(versionStr, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  } catch (error) {
    logger.warn("Failed to get cache namespace version; using default version 1", {
      namespace,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return 1;
  }
}

/**
 * Atomically increments the version for a namespace, invalidating all versioned keys instantly.
 */
export async function bumpNamespaceVersion(namespace: string): Promise<number> {
  try {
    const redis = getRedisClient();
    const connected = await ensureRedisConnected(redis);
    if (!connected) return 1;

    let newVersion = await redis.incr(`cache:v:${namespace}`);
    if (newVersion === 1) {
      newVersion = await redis.incr(`cache:v:${namespace}`);
    }

    logger.info("Cache namespace invalidated", {
      namespace,
      newVersion,
    });
    return newVersion;
  } catch (error) {
    logger.warn("Failed to bump cache namespace version; mutation will continue", {
      namespace,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return 1;
  }
}

/**
 * Reads a JSON value from Redis cache.
 * Returns null if key is not found or if Redis is unavailable.
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient();
    const connected = await ensureRedisConnected(redis);
    if (!connected) return null;

    const raw = await redis.get(key);
    if (!raw) return null;

    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn("Cache read error; treating as miss", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Writes a JSON-serializable value to Redis with an explicit TTL in seconds.
 * Returns true if stored, false if write failed.
 */
export async function setCached<T>(key: string, data: T, ttlSeconds: number): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const connected = await ensureRedisConnected(redis);
    if (!connected) return false;

    const serialized = JSON.stringify(data);
    await redis.setex(key, ttlSeconds, serialized);
    return true;
  } catch (error) {
    logger.warn("Cache write error; continuing without caching", {
      key,
      ttlSeconds,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * Deletes a single cache key.
 */
export async function deleteCached(key: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const connected = await ensureRedisConnected(redis);
    if (!connected) return false;

    await redis.del(key);
    return true;
  } catch (error) {
    logger.warn("Cache delete error", {
      key,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return false;
  }
}

/**
 * High-level Cache-Aside pattern helper:
 * 1. Checks cache for the given key.
 * 2. On hit: returns cached data with hit: true.
 * 3. On miss / error: calls loader(), saves result with TTL, and returns with hit: false.
 * Errors in loader are never swallowed or cached.
 */
export async function getCachedOrFetch<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<CacheResult<T>> {
  const cached = await getCached<T>(key);
  if (cached !== null) {
    logger.debug("Cache hit", { key });
    return { data: cached, hit: true };
  }

  logger.info("Cache miss", { key, ttlSeconds });
  const freshData = await loader();

  // Write asynchronously or await safely without breaking if Redis write fails
  await setCached(key, freshData, ttlSeconds);

  return { data: freshData, hit: false };
}

/**
 * Catalog Invalidation & Versioning
 */
export async function invalidateCatalogCache(type: "exercises" | "foods"): Promise<void> {
  await bumpNamespaceVersion(`catalog:${type}`);
}

export async function getCatalogVersion(type: "exercises" | "foods"): Promise<number> {
  return getNamespaceVersion(`catalog:${type}`);
}

/**
 * User Dashboard Invalidation & Versioning
 * Invalidation bumps the version for dashboard:${userId}, instantly isolating any timezone cache entries.
 */
export async function invalidateDashboardCache(userId: string): Promise<void> {
  await bumpNamespaceVersion(`dashboard:${userId}`);
}

export async function getDashboardVersion(userId: string): Promise<number> {
  return getNamespaceVersion(`dashboard:${userId}`);
}
