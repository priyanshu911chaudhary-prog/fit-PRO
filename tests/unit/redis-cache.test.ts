import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import {
  getCached,
  setCached,
  deleteCached,
  getCachedOrFetch,
  getNamespaceVersion,
  bumpNamespaceVersion,
  invalidateCatalogCache,
  getCatalogVersion,
  invalidateDashboardCache,
  getDashboardVersion,
} from "@/lib/cache/redis-cache";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";

describe("Redis Cache Utility (Unit Tests)", () => {
  const testKeys: string[] = [];

  beforeAll(async () => {
    const redis = getRedisClient();
    await ensureRedisConnected(redis);
  });

  afterAll(async () => {
    const redis = getRedisClient();
    if (testKeys.length > 0) {
      try {
        await redis.del(...testKeys);
      } catch {
        // Cleanup best effort
      }
    }
  });

  it("cold cache executes loader and caches the result", async () => {
    const key = `test:cache:cold:${Date.now()}`;
    testKeys.push(key);

    let loaderExecutions = 0;
    const loader = async () => {
      loaderExecutions++;
      return { id: 1, message: "fresh data" };
    };

    const res1 = await getCachedOrFetch(key, 60, loader);
    expect(res1.hit).toBe(false);
    expect(res1.data).toEqual({ id: 1, message: "fresh data" });
    expect(loaderExecutions).toBe(1);

    // Verify key was stored in Redis
    const stored = await getCached<{ id: number; message: string }>(key);
    expect(stored).toEqual({ id: 1, message: "fresh data" });
  });

  it("warm cache returns cached value without executing loader again", async () => {
    const key = `test:cache:warm:${Date.now()}`;
    testKeys.push(key);

    let loaderExecutions = 0;
    const loader = async () => {
      loaderExecutions++;
      return { counter: 42 };
    };

    // First call: cold
    const res1 = await getCachedOrFetch(key, 60, loader);
    expect(res1.hit).toBe(false);
    expect(loaderExecutions).toBe(1);

    // Second call: warm
    const res2 = await getCachedOrFetch(key, 60, loader);
    expect(res2.hit).toBe(true);
    expect(res2.data).toEqual({ counter: 42 });
    expect(loaderExecutions).toBe(1); // Loader was not called again
  });

  it("version bump invalidates namespace without scanning keys", async () => {
    const ns = `test_ns_${Date.now()}`;
    const v1 = await getNamespaceVersion(ns);
    expect(v1).toBeGreaterThanOrEqual(1);

    const v2 = await bumpNamespaceVersion(ns);
    expect(v2).toBe(v1 + 1);

    const v3 = await getNamespaceVersion(ns);
    expect(v3).toBe(v2);
  });

  it("typed catalog and dashboard invalidators bump versions predictably", async () => {
    const exV1 = await getCatalogVersion("exercises");
    await invalidateCatalogCache("exercises");
    const exV2 = await getCatalogVersion("exercises");
    expect(exV2).toBe(exV1 + 1);

    const foodV1 = await getCatalogVersion("foods");
    await invalidateCatalogCache("foods");
    const foodV2 = await getCatalogVersion("foods");
    expect(foodV2).toBe(foodV1 + 1);

    const testUser = `user_${Date.now()}`;
    const userV1 = await getDashboardVersion(testUser);
    await invalidateDashboardCache(testUser);
    const userV2 = await getDashboardVersion(testUser);
    expect(userV2).toBe(userV1 + 1);
  });

  it("redis read failure falls back to loader without breaking", async () => {
    const redis = getRedisClient();
    const getSpy = vi.spyOn(redis, "get").mockRejectedValueOnce(new Error("Redis read error simulation"));

    const key = `test:cache:read_err:${Date.now()}`;
    let loaderRan = false;

    const res = await getCachedOrFetch(key, 60, async () => {
      loaderRan = true;
      return { fallback: true };
    });

    expect(res.hit).toBe(false);
    expect(res.data).toEqual({ fallback: true });
    expect(loaderRan).toBe(true);

    getSpy.mockRestore();
  });

  it("redis write failure does not break a successful data read", async () => {
    const redis = getRedisClient();
    const setexSpy = vi.spyOn(redis, "setex").mockRejectedValueOnce(new Error("Redis write failure simulation"));

    const key = `test:cache:write_err:${Date.now()}`;
    const res = await getCachedOrFetch(key, 60, async () => {
      return { success: true };
    });

    expect(res.hit).toBe(false);
    expect(res.data).toEqual({ success: true });

    setexSpy.mockRestore();
  });

  it("loader error is never cached and bubbles to caller", async () => {
    const key = `test:cache:loader_err:${Date.now()}`;
    await expect(
      getCachedOrFetch(key, 60, async () => {
        throw new Error("Application logic failure in loader");
      })
    ).rejects.toThrow("Application logic failure in loader");

    // Ensure error was not cached as null or data
    const cached = await getCached(key);
    expect(cached).toBeNull();
  });

  it("deleteCached removes single keys explicitly", async () => {
    const key = `test:cache:del:${Date.now()}`;
    await setCached(key, { val: 123 }, 60);

    const before = await getCached(key);
    expect(before).toEqual({ val: 123 });

    await deleteCached(key);
    const after = await getCached(key);
    expect(after).toBeNull();
  });
});
