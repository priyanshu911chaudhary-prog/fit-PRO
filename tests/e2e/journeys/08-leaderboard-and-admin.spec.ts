import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { LeaderboardSettings } from "@/models/leaderboardSettings";

test.describe("Journey 08: Leaderboard Privacy and Administrative Controls", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("opted-out users are removed from public rankings and marked ineligible", async ({ baseURL }) => {
    const { user, accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    // 1. Ensure user has a leaderboard settings entry with optIn: false
    const patchRes = await fetch(`${baseURL || "http://localhost:3000"}/api/leaderboard/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
      body: JSON.stringify({ optIn: false }),
    });

    expect(patchRes.status).toBe(200);

    // 2. Verify settings and weekly entry in DB
    const settings = await LeaderboardSettings.findOne({ user: user._id });
    expect(settings?.optIn).toBe(false);

    // 3. Query public leaderboard
    const publicLbRes = await fetch(`${baseURL || "http://localhost:3000"}/api/leaderboard`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      },
    });

    expect(publicLbRes.status).toBe(200);
    const lbData = await publicLbRes.json();

    // Opted out user must not appear in the ranked participant entries
    const rankedUserIds = (lbData.data?.entries || []).map((e: { userId: string }) => e.userId);
    expect(rankedUserIds).not.toContain(user._id.toString());
  });

  test("admin queue health endpoint strictly enforces administrator privileges", async ({ baseURL }) => {
    // 1. Ordinary User (role: "user")
    const ordinary = await ctx.createTestUser({ role: "user", hasProfile: true });

    const unauthRes = await fetch(`${baseURL || "http://localhost:3000"}/api/admin/queues`, {
      headers: {
        Authorization: `Bearer ${ordinary.accessToken}`,
        Cookie: `accessToken=${ordinary.accessToken}; refreshToken=${ordinary.refreshToken}`,
      },
    });

    // Ordinary user must be rejected with HTTP 403 Forbidden
    expect(unauthRes.status).toBe(403);
    const errBody = await unauthRes.json();
    expect(errBody.message).toContain("Administrator privileges required");

    // 2. Admin User (role: "admin")
    const admin = await ctx.createTestUser({ role: "admin", hasProfile: true });

    const authRes = await fetch(`${baseURL || "http://localhost:3000"}/api/admin/queues`, {
      headers: {
        Authorization: `Bearer ${admin.accessToken}`,
        Cookie: `accessToken=${admin.accessToken}; refreshToken=${admin.refreshToken}`,
      },
    });

    expect(authRes.status).toBe(200);
    const adminData = await authRes.json();
    expect(adminData.data?.queues).toBeDefined();
    expect(adminData.data?.outboxes).toBeDefined();
    expect(adminData.data?.schedulers).toBeDefined();

    // 3. Request without any authentication or admin key
    const anonRes = await fetch(`${baseURL || "http://localhost:3000"}/api/admin/queues`);
    expect(anonRes.status).toBe(401);
  });
});
