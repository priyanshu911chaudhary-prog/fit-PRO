import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { ApiError } from "@/lib/api/api-error";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";

describe("API Tests -> Distributed Rate Limiting (Redis Backend)", () => {
  const createdTestKeys: string[] = [];

  beforeAll(async () => {
    const redis = getRedisClient();
    await ensureRedisConnected(redis);
  });

  afterAll(async () => {
    const redis = getRedisClient();
    if (createdTestKeys.length > 0) {
      try {
        await redis.del(...createdTestKeys);
      } catch {
        // Cleanup best effort
      }
    }
  });

  it("permits initial request and computes remaining window quota", async () => {
    const testId = `user_${Date.now()}_1`;
    const key = `rate-limit:test_rate_limit:${testId}`;
    createdTestKeys.push(key);

    const mockReq = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-forwarded-for": "192.168.1.100" },
    });

    const res = await checkRateLimit(mockReq, {
      keyPrefix: "test_rate_limit",
      identifier: testId,
      limit: 5,
      windowSeconds: 60,
    });

    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(4);
    expect(res.reset).toBeInstanceOf(Date);
  });

  it("decrements remaining quota across sequential requests atomically", async () => {
    const testId = `user_${Date.now()}_2`;
    const key = `rate-limit:test_rate_limit:${testId}`;
    createdTestKeys.push(key);

    const mockReq = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-forwarded-for": "192.168.1.101" },
    });

    for (let i = 1; i <= 3; i++) {
      const res = await checkRateLimit(mockReq, {
        keyPrefix: "test_rate_limit",
        identifier: testId,
        limit: 5,
        windowSeconds: 60,
      });
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(5 - i);
    }
  });

  it("rejects with 429 Too Many Requests when quota is exceeded", async () => {
    const testId = `user_${Date.now()}_3`;
    const key = `rate-limit:test_rate_limit:${testId}`;
    createdTestKeys.push(key);

    const mockReq = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-forwarded-for": "192.168.1.102" },
    });

    await checkRateLimit(mockReq, {
      keyPrefix: "test_rate_limit",
      identifier: testId,
      limit: 2,
      windowSeconds: 60,
    });

    await checkRateLimit(mockReq, {
      keyPrefix: "test_rate_limit",
      identifier: testId,
      limit: 2,
      windowSeconds: 60,
    });

    // 3rd call exceeds limit -> must throw ApiError 429
    await expect(
      checkRateLimit(mockReq, {
        keyPrefix: "test_rate_limit",
        identifier: testId,
        limit: 2,
        windowSeconds: 60,
      })
    ).rejects.toThrow(ApiError);
  });

  it("proves IP rotation spoofing cannot bypass identifier rate limit", async () => {
    const targetEmail = `rate_target_${Date.now()}@fitpro.dev`;
    const key = `rate-limit:auth:login:email:${targetEmail}`;
    createdTestKeys.push(key);

    const spoofedIps = ["10.0.0.1", "172.16.0.42", "192.168.1.99"];

    for (let i = 0; i < 2; i++) {
      const spoofedReq = new Request("http://localhost:3000/api/auth/login", {
        headers: { "x-forwarded-for": spoofedIps[i] },
      });

      const res = await checkRateLimit(spoofedReq, {
        keyPrefix: "auth:login:email",
        identifier: targetEmail,
        limit: 2,
        windowSeconds: 60,
      });
      expect(res.allowed).toBe(true);
    }

    // 3rd attempt with new IP must still be blocked by email identifier limit
    const thirdReq = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-forwarded-for": spoofedIps[2] },
    });

    await expect(
      checkRateLimit(thirdReq, {
        keyPrefix: "auth:login:email",
        identifier: targetEmail,
        limit: 2,
        windowSeconds: 60,
        message: "Too many login attempts for this account.",
      })
    ).rejects.toThrow(ApiError);
  });

  it("follows explicit fail-open policy when Redis is unavailable or errors", async () => {
    const redis = getRedisClient();
    const evalSpy = vi.spyOn(redis, "eval").mockRejectedValueOnce(new Error("Redis connection dropped"));

    const testId = `user_${Date.now()}_failopen`;
    const mockReq = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });

    const res = await checkRateLimit(mockReq, {
      keyPrefix: "test_failopen",
      identifier: testId,
      limit: 3,
      windowSeconds: 60,
    });

    expect(res.allowed).toBe(true);
    expect(res.remaining).toBe(1);
    expect(res.reset).toBeInstanceOf(Date);

    evalSpy.mockRestore();
  });
});
