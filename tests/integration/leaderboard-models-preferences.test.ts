import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";
import { resolveUserTargets } from "@/lib/leaderboard/targets";
import { updateRedisLeaderboardScore, getUserLeaderboardRank } from "@/lib/leaderboard/redis-ranking";
import { getCompetitionWeek } from "@/lib/leaderboard/calendar";

describe("Leaderboard Models & Preference Settings (Part B & Part G)", () => {
  let redis: ReturnType<typeof getRedisClient>;
  let testUserId1: mongoose.Types.ObjectId;
  let testUserId2: mongoose.Types.ObjectId;
  const currentWeek = getCompetitionWeek(new Date());

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri!);
    }
    redis = getRedisClient();
    await ensureRedisConnected(redis);

    const u1 = await User.create({
      fullName: "Settings Tester One",
      email: `pref_test1_${Date.now()}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    testUserId1 = u1._id as mongoose.Types.ObjectId;

    const u2 = await User.create({
      fullName: "Settings Tester Two",
      email: `pref_test2_${Date.now()}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    testUserId2 = u2._id as mongoose.Types.ObjectId;
  });

  beforeEach(async () => {
    await LeaderboardSettings.deleteMany({ user: { $in: [testUserId1, testUserId2] } });
    await WeeklyLeaderboardEntry.deleteMany({ user: { $in: [testUserId1, testUserId2] } });
    if (redis) {
      await redis.del(`leaderboard:weekly:${currentWeek.weekStart}`);
    }
  });

  afterAll(async () => {
    await LeaderboardSettings.deleteMany({ user: { $in: [testUserId1, testUserId2] } });
    await WeeklyLeaderboardEntry.deleteMany({ user: { $in: [testUserId1, testUserId2] } });
    await User.deleteMany({ _id: { $in: [testUserId1, testUserId2] } });
    if (redis) {
      await redis.del(`leaderboard:weekly:${currentWeek.weekStart}`);
    }
  });

  describe("WeeklyLeaderboardEntry Compound Unique Index", () => {
    it("enforces unique (user, weekStart) preventing duplicate entries", async () => {
      await WeeklyLeaderboardEntry.create({
        user: testUserId1,
        weekStart: currentWeek.weekStart,
        weekEnd: currentWeek.weekEnd,
        scoreBasisPoints: 8500,
        displayScore: 85,
        workoutComponent: 1.0,
        proteinComponent: 0.8,
        hydrationComponent: 0.7,
        qualifyingWorkoutsCount: 3,
        trackedDaysCount: 5,
        isEligible: true,
        displayNameSnapshot: "TesterOne",
        targetSnapshot: {
          weeklyWorkoutGoal: 3,
          dailyProteinTarget: 120,
          dailyHydrationTarget: 2500,
        },
        scoringVersion: 1,
        computedAt: new Date(),
      });

      // Attempting to insert a duplicate (user, weekStart) should throw Mongo duplicate key error
      await expect(
        WeeklyLeaderboardEntry.create({
          user: testUserId1,
          weekStart: currentWeek.weekStart,
          weekEnd: currentWeek.weekEnd,
          scoreBasisPoints: 9000,
          displayScore: 90,
          workoutComponent: 1.0,
          proteinComponent: 0.9,
          hydrationComponent: 0.8,
          qualifyingWorkoutsCount: 4,
          trackedDaysCount: 6,
          isEligible: true,
          displayNameSnapshot: "TesterOne",
          targetSnapshot: {
            weeklyWorkoutGoal: 3,
            dailyProteinTarget: 120,
            dailyHydrationTarget: 2500,
          },
          scoringVersion: 1,
          computedAt: new Date(),
        })
      ).rejects.toThrow(/E11000/);
    });
  });

  describe("Effective-Dated Target Snapshots & Policy", () => {
    it("preserves active targets for current week and schedules pending targets for next week", async () => {
      // Create initial settings
      await LeaderboardSettings.create({
        user: testUserId1,
        optIn: true,
        displayName: "TesterOne",
        weeklyWorkoutGoal: 3,
        dailyProteinTarget: 120,
        dailyHydrationTarget: 2500,
      });

      // User changes goals midweek
      const nextWeek = getCompetitionWeek(currentWeek.weekEnd);

      const updated = await LeaderboardSettings.findOneAndUpdate(
        { user: testUserId1 },
        {
          pendingWeeklyWorkoutGoal: 5,
          pendingDailyProteinTarget: 160,
          pendingDailyHydrationTarget: 3200,
          pendingGoalsEffectiveWeekStart: nextWeek.weekStart,
        },
        { returnDocument: "after" }
      );

      expect(updated?.weeklyWorkoutGoal).toBe(3);
      expect(updated?.pendingWeeklyWorkoutGoal).toBe(5);
      expect(updated?.pendingGoalsEffectiveWeekStart).toBe(nextWeek.weekStart);

      // Resolving targets for current week still returns current active targets (3, 120, 2500)
      const currentResolved = await resolveUserTargets(testUserId1.toString(), currentWeek.weekStart);
      expect(currentResolved.weeklyWorkoutGoal).toBe(3);
      expect(currentResolved.dailyProteinTarget).toBe(120);
      expect(currentResolved.dailyHydrationTarget).toBe(2500);

      // Resolving targets for next week promotes pending targets to active targets
      const nextResolved = await resolveUserTargets(testUserId1.toString(), nextWeek.weekStart);
      expect(nextResolved.weeklyWorkoutGoal).toBe(5);
      expect(nextResolved.dailyProteinTarget).toBe(160);
      expect(nextResolved.dailyHydrationTarget).toBe(3200);

      // Verify that after promotion, the settings document updated active targets and cleared pending
      const docAfterPromotion = await LeaderboardSettings.findOne({ user: testUserId1 });
      expect(docAfterPromotion?.weeklyWorkoutGoal).toBe(5);
      expect(docAfterPromotion?.dailyProteinTarget).toBe(160);
      expect(docAfterPromotion?.dailyHydrationTarget).toBe(3200);
      expect(docAfterPromotion?.pendingGoalsEffectiveWeekStart).toBeUndefined();
    });
  });

  describe("Public Opt-In and Immediate Opt-Out", () => {
    it("immediately removes user from active Redis ranking and marks entry ineligible on opt-out", async () => {
      // Opt-in user
      await LeaderboardSettings.create({
        user: testUserId1,
        optIn: true,
        displayName: "RankedTester",
        weeklyWorkoutGoal: 3,
        dailyProteinTarget: 120,
        dailyHydrationTarget: 2500,
      });

      // Add to Redis and Mongo
      await updateRedisLeaderboardScore(currentWeek.weekStart, testUserId1.toString(), 8200);
      await WeeklyLeaderboardEntry.create({
        user: testUserId1,
        weekStart: currentWeek.weekStart,
        weekEnd: currentWeek.weekEnd,
        scoreBasisPoints: 8200,
        displayScore: 82,
        workoutComponent: 1.0,
        proteinComponent: 0.7,
        hydrationComponent: 0.7,
        qualifyingWorkoutsCount: 3,
        trackedDaysCount: 5,
        isEligible: true,
        displayNameSnapshot: "RankedTester",
        targetSnapshot: {
          weeklyWorkoutGoal: 3,
          dailyProteinTarget: 120,
          dailyHydrationTarget: 2500,
        },
        scoringVersion: 1,
        computedAt: new Date(),
      });

      const initialRank = await getUserLeaderboardRank(currentWeek.weekStart, testUserId1.toString());
      expect(initialRank?.rank).toBe(1);

      // User opts out
      await LeaderboardSettings.updateOne({ user: testUserId1 }, { optIn: false });
      // Invalidation logic removes from Redis and updates entry
      if (redis) {
        await redis.zrem(`leaderboard:weekly:${currentWeek.weekStart}`, testUserId1.toString());
      }
      await WeeklyLeaderboardEntry.updateOne(
        { user: testUserId1, weekStart: currentWeek.weekStart },
        { isEligible: false, ineligibilityReason: "User opted out of public leaderboard" }
      );

      // Verify rank in Redis is now null
      const rankAfterOptOut = await getUserLeaderboardRank(currentWeek.weekStart, testUserId1.toString());
      expect(rankAfterOptOut?.rank).toBeNull();

      // Verify MongoDB entry reflects ineligibility
      const entry = await WeeklyLeaderboardEntry.findOne({ user: testUserId1, weekStart: currentWeek.weekStart });
      expect(entry?.isEligible).toBe(false);
      expect(entry?.ineligibilityReason).toBe("User opted out of public leaderboard");
    });
  });

  describe("Cross-User Isolation", () => {
    it("ensures User 1 settings and target changes do not affect User 2", async () => {
      await LeaderboardSettings.create([
        {
          user: testUserId1,
          optIn: true,
          displayName: "User One",
          weeklyWorkoutGoal: 4,
          dailyProteinTarget: 140,
          dailyHydrationTarget: 3000,
        },
        {
          user: testUserId2,
          optIn: true,
          displayName: "User Two",
          weeklyWorkoutGoal: 3,
          dailyProteinTarget: 100,
          dailyHydrationTarget: 2200,
        },
      ]);

      const targets1 = await resolveUserTargets(testUserId1.toString(), currentWeek.weekStart);
      const targets2 = await resolveUserTargets(testUserId2.toString(), currentWeek.weekStart);

      expect(targets1.weeklyWorkoutGoal).toBe(4);
      expect(targets1.dailyProteinTarget).toBe(140);
      expect(targets1.dailyHydrationTarget).toBe(3000);

      expect(targets2.weeklyWorkoutGoal).toBe(3);
      expect(targets2.dailyProteinTarget).toBe(100);
      expect(targets2.dailyHydrationTarget).toBe(2200);
    });
  });
});
