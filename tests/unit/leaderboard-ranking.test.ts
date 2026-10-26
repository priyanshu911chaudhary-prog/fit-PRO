import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import {
  updateRedisLeaderboardScore,
  removeRedisLeaderboardParticipant,
  getLeaderboardRankings,
  getUserLeaderboardRank,
  rebuildRedisLeaderboard,
  assignCompetitionRanks,
} from "@/lib/leaderboard/redis-ranking";

describe("Leaderboard Redis Ranking & Tie-Breaking (Part C)", () => {
  const testWeekStart = "2026-10-19";
  const redisKey = `leaderboard:weekly:${testWeekStart}`;
  let redis: ReturnType<typeof getRedisClient>;

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri!);
    }
    redis = getRedisClient();
    await ensureRedisConnected(redis);
  });

  beforeEach(async () => {
    if (redis) {
      await redis.del(redisKey);
    }
    await WeeklyLeaderboardEntry.deleteMany({ weekStart: testWeekStart });
  });

  afterAll(async () => {
    if (redis) {
      await redis.del(redisKey);
    }
    await WeeklyLeaderboardEntry.deleteMany({ weekStart: testWeekStart });
  });

  describe("assignCompetitionRanks (Pure Logic)", () => {
    it("assigns standard competition ranking (1, 1, 3) for ties", () => {
      const items = [
        { scoreBasisPoints: 9500, name: "Alice" },
        { scoreBasisPoints: 9500, name: "Bob" },
        { scoreBasisPoints: 8000, name: "Charlie" },
        { scoreBasisPoints: 7500, name: "Dave" },
        { scoreBasisPoints: 7500, name: "Eve" },
        { scoreBasisPoints: 6000, name: "Frank" },
      ];

      const ranked = assignCompetitionRanks(items, 0);

      expect(ranked[0].rank).toBe(1); // Alice
      expect(ranked[1].rank).toBe(1); // Bob (tie for 1st)
      expect(ranked[2].rank).toBe(3); // Charlie (3rd because 2 tied for 1st)
      expect(ranked[3].rank).toBe(4); // Dave
      expect(ranked[4].rank).toBe(4); // Eve (tie for 4th)
      expect(ranked[5].rank).toBe(6); // Frank (6th)
    });

    it("handles single participants and offset pagination correctly", () => {
      const page2Items = [
        { scoreBasisPoints: 7000, name: "User1" },
        { scoreBasisPoints: 6500, name: "User2" },
      ];
      // If page 2 starts at offset 20 (items 21 and 22)
      const ranked = assignCompetitionRanks(page2Items, 20);
      expect(ranked[0].rank).toBe(21);
      expect(ranked[1].rank).toBe(22);
    });
  });

  describe("Redis Sorted Set Score Operations", () => {
    const user1 = new mongoose.Types.ObjectId().toString();
    const user2 = new mongoose.Types.ObjectId().toString();
    const user3 = new mongoose.Types.ObjectId().toString();

    it("inserts and updates scores in Redis sorted set", async () => {
      await updateRedisLeaderboardScore(testWeekStart, user1, 8500);
      await updateRedisLeaderboardScore(testWeekStart, user2, 9200);

      // Verify user2 is rank 1, user1 is rank 2
      const rank2 = await getUserLeaderboardRank(testWeekStart, user2);
      expect(rank2?.rank).toBe(1);
      expect(rank2?.scoreBasisPoints).toBe(9200);

      const rank1 = await getUserLeaderboardRank(testWeekStart, user1);
      expect(rank1?.rank).toBe(2);
      expect(rank1?.scoreBasisPoints).toBe(8500);

      // Now update user1 with higher score (e.g. 9500)
      await updateRedisLeaderboardScore(testWeekStart, user1, 9500);

      const updatedRank1 = await getUserLeaderboardRank(testWeekStart, user1);
      expect(updatedRank1?.rank).toBe(1);
      expect(updatedRank1?.scoreBasisPoints).toBe(9500);

      const updatedRank2 = await getUserLeaderboardRank(testWeekStart, user2);
      expect(updatedRank2?.rank).toBe(2);
    });

    it("handles shared competition ties in getUserLeaderboardRank", async () => {
      // Both user1 and user2 score 9000
      await updateRedisLeaderboardScore(testWeekStart, user1, 9000);
      await updateRedisLeaderboardScore(testWeekStart, user2, 9000);
      // user3 scores 8000
      await updateRedisLeaderboardScore(testWeekStart, user3, 8000);

      const rankU1 = await getUserLeaderboardRank(testWeekStart, user1);
      const rankU2 = await getUserLeaderboardRank(testWeekStart, user2);
      const rankU3 = await getUserLeaderboardRank(testWeekStart, user3);

      expect(rankU1?.rank).toBe(1);
      expect(rankU2?.rank).toBe(1);
      // User 3 must be rank 3 (1, 1, 3)
      expect(rankU3?.rank).toBe(3);
    });

    it("removes opted-out or ineligible participants from sorted set", async () => {
      await updateRedisLeaderboardScore(testWeekStart, user1, 9000);
      await updateRedisLeaderboardScore(testWeekStart, user2, 8000);

      await removeRedisLeaderboardParticipant(testWeekStart, user1);

      const rankU1 = await getUserLeaderboardRank(testWeekStart, user1);
      expect(rankU1?.rank).toBeNull();

      // user2 should now be rank 1
      const rankU2 = await getUserLeaderboardRank(testWeekStart, user2);
      expect(rankU2?.rank).toBe(1);
    });
  });

  describe("Rebuilding Redis from MongoDB and Fallback", () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const userC = new mongoose.Types.ObjectId();

    beforeEach(async () => {
      // Seed MongoDB WeeklyLeaderboardEntry records
      await WeeklyLeaderboardEntry.insertMany([
        {
          user: userA,
          weekStart: testWeekStart,
          weekEnd: "2026-10-26",
          scoreBasisPoints: 8800,
          displayScore: 88,
          workoutComponent: 1.0,
          proteinComponent: 0.8,
          hydrationComponent: 0.8,
          targetSnapshot: {
            weeklyWorkoutGoal: 3,
            dailyProteinTarget: 120,
            dailyHydrationTarget: 2500,
          },
          isEligible: true,
          displayNameSnapshot: "Athlete A",
          computedAt: new Date(),
        },
        {
          user: userB,
          weekStart: testWeekStart,
          weekEnd: "2026-10-26",
          scoreBasisPoints: 9400,
          displayScore: 94,
          workoutComponent: 1.0,
          proteinComponent: 1.0,
          hydrationComponent: 0.8,
          targetSnapshot: {
            weeklyWorkoutGoal: 3,
            dailyProteinTarget: 120,
            dailyHydrationTarget: 2500,
          },
          isEligible: true,
          displayNameSnapshot: "Athlete B",
          computedAt: new Date(),
        },
        {
          user: userC,
          weekStart: testWeekStart,
          weekEnd: "2026-10-26",
          scoreBasisPoints: 5000,
          displayScore: 50,
          workoutComponent: 0.5,
          proteinComponent: 0.5,
          hydrationComponent: 0.5,
          targetSnapshot: {
            weeklyWorkoutGoal: 3,
            dailyProteinTarget: 120,
            dailyHydrationTarget: 2500,
          },
          isEligible: false, // ineligible should NOT be in public rankings
          ineligibleReason: "Less than 4 tracked days",
          displayNameSnapshot: "Athlete C",
          computedAt: new Date(),
        },
      ]);
    });

    it("rebuilds Redis sorted set from durable MongoDB entries", async () => {
      if (redis) {
        await redis.del(redisKey);
      }

      const rebuiltCount = await rebuildRedisLeaderboard(testWeekStart);
      // Only eligible participants (userA and userB) should be indexed
      expect(rebuiltCount).toBe(2);

      const rankings = await getLeaderboardRankings(testWeekStart, 10, 0);
      expect(rankings.total).toBe(2);
      expect(rankings.entries[0].userId).toBe(userB.toString());
      expect(rankings.entries[0].rank).toBe(1);
      expect(rankings.entries[0].scoreBasisPoints).toBe(9400);

      expect(rankings.entries[1].userId).toBe(userA.toString());
      expect(rankings.entries[1].rank).toBe(2);
      expect(rankings.entries[1].scoreBasisPoints).toBe(8800);
    });

    it("falls back to MongoDB ranking seamlessly when Redis returns error", async () => {
      if (redis) {
        await redis.del(redisKey);
      }

      // Query without rebuilding Redis - should fall back to MongoDB rankings
      const result = await getLeaderboardRankings(testWeekStart, 10, 0);
      expect(result.total).toBe(2);
      expect(result.entries.length).toBe(2);
      expect(result.entries[0].displayName).toBe("Athlete B");
      expect(result.entries[1].displayName).toBe("Athlete A");
    });
  });
});
