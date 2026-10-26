import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { User } from "@/models/user";
import { Exercise } from "@/models/exercise";
import { WorkoutLog } from "@/models/workoutLog";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { LeaderboardOutbox } from "@/models/leaderboardOutbox";
import { LeaderboardWeekStatus } from "@/models/leaderboardWeekStatus";
import { signAccessToken } from "@/lib/auth/jwt";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";
import { getCompetitionWeek, getPreviousCompetitionWeek } from "@/lib/leaderboard/calendar";
import {
  recalculateUserWeeklyScore,
  finalizeCompetitionWeek,
  processLeaderboardOutbox,
} from "@/lib/leaderboard/recomputation";
import { POST as reconcileHandler } from "@/app/api/leaderboard/reconcile/route";

describe("Leaderboard Concurrency, Finalization & Outbox Bounding (Part 2 & Part 3 Audit)", () => {
  let redis: ReturnType<typeof getRedisClient>;
  let user: { id: string; email: string; token: string };
  let testExerciseId: string;

  const currentWeek = getCompetitionWeek();
  const prevWeek = getPreviousCompetitionWeek(currentWeek.weekStart);

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri!);
    }
    redis = getRedisClient();
    await ensureRedisConnected(redis);

    const ts = Date.now();
    const u = await User.create({
      fullName: "Concurrency Tester",
      email: `concur_${ts}@fitpro.test`,
      password: "Password123!",
      isVerified: true,
    });
    const token = await signAccessToken({ userId: u._id.toString(), email: u.email });
    user = { id: u._id.toString(), email: u.email, token };

    const ex = await Exercise.create({
      name: `Deadlift Concur ${ts}`,
      targetMuscle: "back",
      category: "strength",
      equipment: "barbell",
    });
    testExerciseId = ex._id.toString();

    await LeaderboardSettings.create({
      user: user.id,
      optIn: true,
      displayName: "ConcurAthlete",
      weeklyWorkoutGoal: 3,
      dailyProteinTarget: 120,
      dailyHydrationTarget: 2500,
    });
  });

  beforeEach(async () => {
    await WorkoutLog.deleteMany({ user: user.id });
    await WeeklyLeaderboardEntry.deleteMany({ user: user.id });
    await LeaderboardOutbox.deleteMany({ user: user.id });
    await LeaderboardWeekStatus.deleteMany({ weekStart: { $in: [currentWeek.weekStart, prevWeek.weekStart] } });
    if (redis) {
      await redis.del(`leaderboard:weekly:${currentWeek.weekStart}`);
      await redis.del(`leaderboard:weekly:${prevWeek.weekStart}`);
    }
  });

  afterAll(async () => {
    await WorkoutLog.deleteMany({ user: user.id });
    await WeeklyLeaderboardEntry.deleteMany({ user: user.id });
    await LeaderboardOutbox.deleteMany({ user: user.id });
    await LeaderboardSettings.deleteMany({ user: user.id });
    await LeaderboardWeekStatus.deleteMany({ weekStart: { $in: [currentWeek.weekStart, prevWeek.weekStart] } });
    await Exercise.deleteOne({ _id: testExerciseId });
    await User.deleteOne({ _id: user.id });
  });

  describe("Concurrency Guard: Superseded Writes Cannot Overwrite Newer Scores", () => {
    it("preserves newer calculation when an older calculation finishes late", async () => {
      // Create initial workout log
      await WorkoutLog.create({
        user: user.id,
        title: "Deadlift Initial Session",
        date: currentWeek.days[0],
        totalDuration: 30,
        completionPercentage: 100,
        exercises: [{ exerciseId: testExerciseId, sets: 3 }],
      });

      // Compute initial score
      await recalculateUserWeeklyScore(user.id, currentWeek.weekStart);
      const entry1 = await WeeklyLeaderboardEntry.findOne({ user: user.id, weekStart: currentWeek.weekStart });
      expect(entry1?.qualifyingWorkoutsCount).toBe(1);

      // Now simulate a newer computation already completed in MongoDB with computedAt in the future
      const futureDate = new Date(Date.now() + 60000); // 1 minute in the future
      await WeeklyLeaderboardEntry.updateOne(
        { user: user.id, weekStart: currentWeek.weekStart },
        {
          $set: {
            scoreBasisPoints: 9999,
            displayScore: 99.99,
            computedAt: futureDate,
          },
        }
      );

      // Trigger recomputation (its computationStartedAt is older than futureDate)
      await recalculateUserWeeklyScore(user.id, currentWeek.weekStart);

      // Verify the newer future score was NOT overwritten!
      const entry2 = await WeeklyLeaderboardEntry.findOne({ user: user.id, weekStart: currentWeek.weekStart });
      expect(entry2?.scoreBasisPoints).toBe(9999);
      expect(entry2?.displayScore).toBe(99.99);
    });

    it("handles concurrent recalculation triggers safely without throwing", async () => {
      await WorkoutLog.create({
        user: user.id,
        title: "Deadlift Second Session",
        date: currentWeek.days[1],
        totalDuration: 40,
        completionPercentage: 100,
        exercises: [{ exerciseId: testExerciseId, sets: 4 }],
      });

      // Fire 5 concurrent recalculations simultaneously
      const promises = Array.from({ length: 5 }, () =>
        recalculateUserWeeklyScore(user.id, currentWeek.weekStart)
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Only one unique document exists
      const entries = await WeeklyLeaderboardEntry.find({ user: user.id, weekStart: currentWeek.weekStart });
      expect(entries.length).toBe(1);
      expect(entries[0].qualifyingWorkoutsCount).toBe(1);
    });
  });

  describe("Finalization Guards & Historical Invariance", () => {
    it("refuses to finalize a live competition week before the scoring period ends", async () => {
      // currentWeek is currently ongoing
      const result = await finalizeCompetitionWeek(currentWeek.weekStart);
      expect(result).toBe(false);

      const status = await LeaderboardWeekStatus.findOne({ weekStart: currentWeek.weekStart });
      expect(status).toBeNull();
    });

    it("finalizes a past competition week atomically and idempotently", async () => {
      // Seed an entry in prevWeek
      await WeeklyLeaderboardEntry.create({
        user: user.id,
        weekStart: prevWeek.weekStart,
        weekEnd: prevWeek.weekEnd,
        scoreBasisPoints: 8500,
        displayScore: 85,
        workoutComponent: 1.0,
        proteinComponent: 0.8,
        hydrationComponent: 0.7,
        qualifyingWorkoutsCount: 3,
        trackedDaysCount: 5,
        isEligible: true,
        displayNameSnapshot: "ConcurAthlete",
        targetSnapshot: {
          weeklyWorkoutGoal: 3,
          dailyProteinTarget: 120,
          dailyHydrationTarget: 2500,
        },
        scoringVersion: 1,
        isFinalized: false,
        computedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      // First finalization attempt on past week should succeed
      const firstAttempt = await finalizeCompetitionWeek(prevWeek.weekStart);
      expect(firstAttempt).toBe(true);

      const status = await LeaderboardWeekStatus.findOne({ weekStart: prevWeek.weekStart });
      expect(status?.isFinalized).toBe(true);
      expect(status?.totalParticipants).toBe(1);

      // Verify the entry is finalized
      const entry = await WeeklyLeaderboardEntry.findOne({ user: user.id, weekStart: prevWeek.weekStart });
      expect(entry?.isFinalized).toBe(true);

      // Second attempt must be idempotent and return false
      const secondAttempt = await finalizeCompetitionWeek(prevWeek.weekStart);
      expect(secondAttempt).toBe(false);
    });

    it("prevents late mutations from rewriting finalized historical scores", async () => {
      // Mark prevWeek as finalized
      await LeaderboardWeekStatus.create({
        weekStart: prevWeek.weekStart,
        weekEnd: prevWeek.weekEnd,
        isFinalized: true,
        finalizedAt: new Date(),
        totalParticipants: 1,
        eligibleParticipants: 1,
      });

      await WeeklyLeaderboardEntry.create({
        user: user.id,
        weekStart: prevWeek.weekStart,
        weekEnd: prevWeek.weekEnd,
        scoreBasisPoints: 7500,
        displayScore: 75,
        workoutComponent: 0.6,
        proteinComponent: 0.7,
        hydrationComponent: 0.7,
        qualifyingWorkoutsCount: 2,
        trackedDaysCount: 4,
        isEligible: true,
        displayNameSnapshot: "ConcurAthlete",
        targetSnapshot: {
          weeklyWorkoutGoal: 3,
          dailyProteinTarget: 120,
          dailyHydrationTarget: 2500,
        },
        scoringVersion: 1,
        isFinalized: true,
        computedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      });

      // Attempting to recalculate prevWeek should be a no-op
      await recalculateUserWeeklyScore(user.id, prevWeek.weekStart);

      const entry = await WeeklyLeaderboardEntry.findOne({ user: user.id, weekStart: prevWeek.weekStart });
      expect(entry?.scoreBasisPoints).toBe(7500); // unchanged
    });
  });

  describe("Outbox Bounds & Bounded Retries", () => {
    it("marks outbox job as failed after 5 unsuccessful attempts", async () => {
      // Create a job with attempts: 4 for an invalid user ID that will throw
      const fakeUserId = new mongoose.Types.ObjectId();
      await LeaderboardOutbox.create({
        user: fakeUserId,
        weekStart: currentWeek.weekStart,
        status: "pending",
        attempts: 4,
      });

      // Process outbox
      await processLeaderboardOutbox(10);

      const job = await LeaderboardOutbox.findOne({ user: fakeUserId, weekStart: currentWeek.weekStart });
      expect(job?.attempts).toBe(5);
      expect(job?.status).toBe("failed");
    });
  });

  describe("Operational Endpoint: POST /api/leaderboard/reconcile", () => {
    it("requires authentication and executes outbox drain and redis rebuild", async () => {
      // Unauthenticated call returns 401
      const unauthReq = new NextRequest("http://localhost:3000/api/leaderboard/reconcile", {
        method: "POST",
      });
      const unauthRes = await reconcileHandler(unauthReq, {});
      expect(unauthRes.status).toBe(401);

      // Authenticated call returns 200
      const authReq = new NextRequest("http://localhost:3000/api/leaderboard/reconcile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekStart: currentWeek.weekStart,
        }),
      });
      const authRes = await reconcileHandler(authReq, {});
      expect(authRes.status).toBe(200);

      const json = await authRes.json();
      expect(json.success).toBe(true);
      expect(json.data.weekStart).toBe(currentWeek.weekStart);
      expect(typeof json.data.outboxJobsProcessed).toBe("number");
      expect(typeof json.data.indexedParticipants).toBe("number");
    });
  });
});
