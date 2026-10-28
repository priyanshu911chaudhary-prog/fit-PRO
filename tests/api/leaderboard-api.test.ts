import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { User } from "@/models/user";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { signAccessToken } from "@/lib/auth/jwt";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";
import { getCompetitionWeek } from "@/lib/leaderboard/calendar";
import { updateRedisLeaderboardScore } from "@/lib/leaderboard/redis-ranking";

import { GET as getLeaderboardHandler } from "@/app/api/leaderboard/route";
import {
  GET as getPreferencesHandler,
  PATCH as patchPreferencesHandler,
} from "@/app/api/leaderboard/preferences/route";

describe("Leaderboard API Endpoints & Privacy (Part E & Part G)", () => {
  let redis: ReturnType<typeof getRedisClient>;
  let userA: { id: string; email: string; token: string };
  let userB: { id: string; email: string; token: string };
  let userOptOut: { id: string; email: string; token: string };

  const currentWeek = getCompetitionWeek(new Date());
  const prevWeekMonday = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const prevWeek = getCompetitionWeek(prevWeekMonday);

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri!);
    }
    redis = getRedisClient();
    await ensureRedisConnected(redis);

    const ts = Date.now();
    // Create User A
    const uA = await User.create({
      fullName: "Alice Runner",
      email: `alice_${ts}@leaderboard-test.com`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenA = await signAccessToken({ userId: uA._id.toString(), email: uA.email });
    userA = { id: uA._id.toString(), email: uA.email, token: tokenA };

    // Create User B
    const uB = await User.create({
      fullName: "Bob Lifter",
      email: `bob_${ts}@leaderboard-test.com`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenB = await signAccessToken({ userId: uB._id.toString(), email: uB.email });
    userB = { id: uB._id.toString(), email: uB.email, token: tokenB };

    // Create Opt-Out User
    const uOpt = await User.create({
      fullName: "Private Charlie",
      email: `charlie_${ts}@leaderboard-test.com`,
      password: "Password123!",
      isVerified: true,
    });
    const tokenOpt = await signAccessToken({ userId: uOpt._id.toString(), email: uOpt.email });
    userOptOut = { id: uOpt._id.toString(), email: uOpt.email, token: tokenOpt };

    // Create Leaderboard Settings
    await LeaderboardSettings.create([
      {
        user: userA.id,
        optIn: true,
        displayName: "AliceSpeed",
        weeklyWorkoutGoal: 4,
        dailyProteinTarget: 130,
        dailyHydrationTarget: 2600,
      },
      {
        user: userB.id,
        optIn: true,
        displayName: "BobPower",
        weeklyWorkoutGoal: 5,
        dailyProteinTarget: 150,
        dailyHydrationTarget: 3000,
      },
      {
        user: userOptOut.id,
        optIn: false,
        displayName: "CharlieGhost",
        weeklyWorkoutGoal: 3,
        dailyProteinTarget: 120,
        dailyHydrationTarget: 2500,
      },
    ]);

    // Seed Current Week Entries
    await WeeklyLeaderboardEntry.create([
      {
        user: userA.id,
        weekStart: currentWeek.weekStart,
        weekEnd: currentWeek.weekEnd,
        scoreBasisPoints: 9200,
        displayScore: 92,
        workoutComponent: 1.0,
        proteinComponent: 0.9,
        hydrationComponent: 0.85,
        qualifyingWorkoutsCount: 4,
        trackedDaysCount: 6,
        isEligible: true,
        displayNameSnapshot: "AliceSpeed",
        targetSnapshot: {
          weeklyWorkoutGoal: 4,
          dailyProteinTarget: 130,
          dailyHydrationTarget: 2600,
        },
        scoringVersion: 1,
        computedAt: new Date(),
      },
      {
        user: userB.id,
        weekStart: currentWeek.weekStart,
        weekEnd: currentWeek.weekEnd,
        scoreBasisPoints: 8500,
        displayScore: 85,
        workoutComponent: 0.8,
        proteinComponent: 0.85,
        hydrationComponent: 0.9,
        qualifyingWorkoutsCount: 4,
        trackedDaysCount: 5,
        isEligible: true,
        displayNameSnapshot: "BobPower",
        targetSnapshot: {
          weeklyWorkoutGoal: 5,
          dailyProteinTarget: 150,
          dailyHydrationTarget: 3000,
        },
        scoringVersion: 1,
        computedAt: new Date(),
      },
      {
        user: userOptOut.id,
        weekStart: currentWeek.weekStart,
        weekEnd: currentWeek.weekEnd,
        scoreBasisPoints: 7000,
        displayScore: 70,
        workoutComponent: 0.6,
        proteinComponent: 0.7,
        hydrationComponent: 0.8,
        qualifyingWorkoutsCount: 2,
        trackedDaysCount: 4,
        isEligible: false,
        ineligibilityReason: "User opted out of public leaderboard",
        displayNameSnapshot: "CharlieGhost",
        targetSnapshot: {
          weeklyWorkoutGoal: 3,
          dailyProteinTarget: 120,
          dailyHydrationTarget: 2500,
        },
        scoringVersion: 1,
        computedAt: new Date(),
      },
    ]);

    // Update Redis sorted set for current week
    await updateRedisLeaderboardScore(currentWeek.weekStart, userA.id, 9200);
    await updateRedisLeaderboardScore(currentWeek.weekStart, userB.id, 8500);

    // Seed Previous Week for testing historical derivation
    await WeeklyLeaderboardEntry.create({
      user: userA.id,
      weekStart: prevWeek.weekStart,
      weekEnd: prevWeek.weekEnd,
      scoreBasisPoints: 8900,
      displayScore: 89,
      workoutComponent: 1.0,
      proteinComponent: 0.85,
      hydrationComponent: 0.8,
      qualifyingWorkoutsCount: 4,
      trackedDaysCount: 6,
      isEligible: true,
      displayNameSnapshot: "AliceSpeed",
      targetSnapshot: {
        weeklyWorkoutGoal: 4,
        dailyProteinTarget: 130,
        dailyHydrationTarget: 2600,
      },
      scoringVersion: 1,
      isFinalized: true,
      computedAt: new Date(),
    });
  });

  afterAll(async () => {
    const userIds = [userA?.id, userB?.id, userOptOut?.id].filter(Boolean);
    await WeeklyLeaderboardEntry.deleteMany({ user: { $in: userIds } });
    await LeaderboardSettings.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    if (redis) {
      await redis.del(`leaderboard:weekly:${currentWeek.weekStart}`);
      await redis.del(`leaderboard:weekly:${prevWeek.weekStart}`);
    }
  });

  describe("Authentication Requirements", () => {
    it("allows unauthenticated requests to GET /api/leaderboard and returns public rankings without currentUser", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard");
      const res = await getLeaderboardHandler(req, {});
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.entries).toBeDefined();
      expect(json.data.currentUser).toBeUndefined();
    });

    it("rejects unauthenticated requests to GET /api/leaderboard/preferences with 401", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard/preferences");
      const res = await getPreferencesHandler(req, {});
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/leaderboard Data & Privacy", () => {
    it("returns public leaderboard entries and does not leak private breakdown of other participants", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=current&limit=10&page=1", {
        headers: { Authorization: `Bearer ${userB.token}` },
      });
      const res = await getLeaderboardHandler(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.weekStart).toBe(currentWeek.weekStart);
      expect(json.data.weekEnd).toBe(currentWeek.weekEnd);
      expect(json.data.pagination.total).toBe(2);

      // Top entries
      expect(json.data.entries.length).toBe(2);
      const top1 = json.data.entries[0];
      expect(top1.displayName).toBe("AliceSpeed");
      expect(top1.rank).toBe(1);
      expect(top1.displayScore).toBe(92);

      // Verify privacy: entries must NOT contain email, private breakdowns, or targetSnapshot
      expect(top1.email).toBeUndefined();
      expect(top1.breakdown).toBeUndefined();
      expect(top1.targetSnapshot).toBeUndefined();
      expect(top1.waterLogs).toBeUndefined();
      expect(top1.mealLogs).toBeUndefined();
      expect(top1.workoutLogs).toBeUndefined();

      // Verify current user (User B) contains private breakdown
      expect(json.data.currentUser).toBeDefined();
      expect(json.data.currentUser.userId).toBe(userB.id);
      expect(json.data.currentUser.displayName).toBe("BobPower");
      expect(json.data.currentUser.rank).toBe(2);
      expect(json.data.currentUser.breakdown).toBeDefined();
      expect(json.data.currentUser.breakdown.workoutComponentScore).toBe(32);
      expect(json.data.currentUser.breakdown.proteinComponentScore).toBe(25.5);
      expect(json.data.currentUser.breakdown.hydrationComponentScore).toBe(27);
      expect(json.data.currentUser.breakdown.trackedDaysCount).toBe(5);
    });

    it("excludes opted-out users from public entries", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=current", {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      const res = await getLeaderboardHandler(req, {});
      const json = await res.json();

      const charlieEntry = json.data.entries.find((e: { userId: string }) => e.userId === userOptOut.id);
      expect(charlieEntry).toBeUndefined();
    });

    it("returns previous week results with winners derived from durable records", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=previous", {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      const res = await getLeaderboardHandler(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.weekStart).toBe(prevWeek.weekStart);
      expect(json.data.entries.length).toBe(1);
      expect(json.data.entries[0].displayName).toBe("AliceSpeed");
      expect(json.data.entries[0].rank).toBe(1);
    });

    it("rejects invalid period query parameters with 400", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard?period=invalid_period", {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      const res = await getLeaderboardHandler(req, {});
      expect(res.status).toBe(400);
    });
  });

  describe("Preferences API: GET & PATCH /api/leaderboard/preferences", () => {
    it("returns authenticated user's current settings via GET", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard/preferences", {
        headers: { Authorization: `Bearer ${userA.token}` },
      });
      const res = await getPreferencesHandler(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data.optIn).toBe(true);
      expect(json.data.displayName).toBe("AliceSpeed");
      expect(json.data.weeklyWorkoutGoal).toBe(4);
      expect(json.data.dailyProteinTarget).toBe(130);
      expect(json.data.dailyHydrationTarget).toBe(2600);
    });

    it("schedules target updates for next week when changed via PATCH", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard/preferences", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${userA.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "AliceUltra",
          weeklyWorkoutGoal: 5,
          dailyProteinTarget: 140,
        }),
      });

      const res = await patchPreferencesHandler(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.displayName).toBe("AliceUltra");
      // Current active targets remain 4 for the ongoing week
      expect(json.data.weeklyWorkoutGoal).toBe(4);
      // Pending targets scheduled for next Monday
      expect(json.data.pendingWeeklyWorkoutGoal).toBe(5);
      expect(json.data.pendingDailyProteinTarget).toBe(140);
      expect(json.data.pendingGoalsEffectiveWeekStart).toBeDefined();
    });

    it("rejects invalid inputs on PATCH (e.g. invalid display name or out-of-range targets)", async () => {
      const req = new NextRequest("http://localhost:3000/api/leaderboard/preferences", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${userA.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "A", // too short (< 3 chars)
          weeklyWorkoutGoal: 20, // max is 14
        }),
      });

      const res = await patchPreferencesHandler(req, {});
      expect(res.status).toBe(400);
    });
  });
});
