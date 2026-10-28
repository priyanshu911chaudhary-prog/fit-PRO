import { describe, it, expect, beforeEach, afterEach } from "vitest";
import mongoose from "mongoose";
import { User } from "@/models/user";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { LeaderboardOutbox } from "@/models/leaderboardOutbox";
import { LeaderboardWeekStatus } from "@/models/leaderboardWeekStatus";
import {
  enqueueLeaderboardRecalculation,
  getLeaderboardQueue,
  closeQueueConnections,
} from "@/lib/queues/jobs";
import { leaderboardProcessor } from "@/workers/processors/leaderboard.processor";
import { LEADERBOARD_JOBS } from "@/lib/queues/definitions";
import { getCompetitionWeek } from "@/lib/leaderboard/calendar";
import { rebuildRedisLeaderboard, getLeaderboardRankings, removeRedisLeaderboardParticipant } from "@/lib/leaderboard/redis-ranking";
import { finalizeCompetitionWeek, processLeaderboardOutbox } from "@/lib/leaderboard/recomputation";
import { connectDB } from "@/lib/db";

describe("Integration: Leaderboard Background Worker, Deduplication, and Recovery", () => {
  let testUserId: mongoose.Types.ObjectId;
  const currentWeek = getCompetitionWeek().weekStart;

  beforeEach(async () => {
    await connectDB();

    testUserId = new mongoose.Types.ObjectId();
    await User.create({
      _id: testUserId,
      fullName: "Leaderboard Worker Tester",
      email: `lb-worker-${Date.now()}@example.com`,
      password: "password123",
      isVerified: true,
      authProvider: "local",
    });

    await LeaderboardSettings.create({
      user: testUserId,
      optIn: true,
      displayName: "LB Tester",
      weeklyWorkoutGoal: 4,
      dailyProteinTarget: 140,
      dailyHydrationTarget: 3000,
    });
  });

  afterEach(async () => {
    await User.deleteOne({ _id: testUserId });
    await LeaderboardSettings.deleteOne({ user: testUserId });
    await WeeklyLeaderboardEntry.deleteMany({ user: testUserId });
    await LeaderboardOutbox.deleteMany({ user: testUserId });
    await removeRedisLeaderboardParticipant(currentWeek, testUserId.toString());
    await closeQueueConnections();
  });

  it("enqueues recalculation job with deterministic deduplication jobId", async () => {
    const queue = getLeaderboardQueue();
    const result1 = await enqueueLeaderboardRecalculation({
      userId: testUserId.toString(),
      weekStart: currentWeek,
    });
    expect(result1.enqueued).toBe(true);

    const job = await queue.getJob(`recalc-${testUserId.toString()}-${currentWeek}`);
    expect(job).not.toBeNull();
    expect((job?.data as any).userId).toBe(testUserId.toString());
    expect((job?.data as any).weekStart).toBe(currentWeek);

    // Repeated enqueue during burst mutation returns safely without error
    const result2 = await enqueueLeaderboardRecalculation({
      userId: testUserId.toString(),
      weekStart: currentWeek,
    });
    expect(result2.enqueued).toBe(true);
  });

  it("leaderboard worker processes score recalculation and persists entry in MongoDB and Redis", async () => {
    const mockJob = {
      id: "job-lb-recalc",
      name: LEADERBOARD_JOBS.RECALCULATE_USER_SCORE,
      data: { userId: testUserId.toString(), weekStart: currentWeek },
      attemptsMade: 0,
    } as any;

    const result = await leaderboardProcessor(mockJob);
    expect(result.success).toBe(true);

    const entry = await WeeklyLeaderboardEntry.findOne({
      user: testUserId,
      weekStart: currentWeek,
    });
    expect(entry).not.toBeNull();
    expect(entry?.displayNameSnapshot).toBe("LB Tester");
  });

  it("finalization refuses to proceed while required work remains unresolved in outbox", async () => {
    // Insert an unresolved outbox item
    await LeaderboardOutbox.create({
      user: testUserId,
      weekStart: currentWeek,
      status: "pending",
      attempts: 0,
    });

    // Finalization should refuse
    const finalized = await finalizeCompetitionWeek(currentWeek);
    expect(finalized).toBe(false);

    const statusDoc = await LeaderboardWeekStatus.findOne({ weekStart: currentWeek });
    expect(statusDoc?.isFinalized).not.toBe(true);
  });

  it("outbox processing atomically claims jobs under concurrency", async () => {
    // Insert 5 outbox jobs
    for (let i = 0; i < 5; i++) {
      await LeaderboardOutbox.create({
        user: new mongoose.Types.ObjectId(),
        weekStart: currentWeek,
        status: "pending",
        attempts: 0,
      });
    }

    // Run two concurrent outbox processor drains
    const [drained1, drained2] = await Promise.all([
      processLeaderboardOutbox(5),
      processLeaderboardOutbox(5),
    ]);

    // Total claimed should not double-count
    expect(drained1 + drained2).toBeLessThanOrEqual(5);

    // Clean up
    await LeaderboardOutbox.deleteMany({ weekStart: currentWeek });
  });

  it("rebuildRedisLeaderboard repairs Redis rankings using atomic temporary key replacement", async () => {
    // Seed an eligible entry in MongoDB
    await WeeklyLeaderboardEntry.create({
      user: testUserId,
      weekStart: currentWeek,
      weekEnd: getCompetitionWeek().weekEnd,
      scoreBasisPoints: 8550,
      displayScore: 85.5,
      workoutComponent: 1,
      proteinComponent: 0.9,
      hydrationComponent: 0.8,
      qualifyingWorkoutsCount: 4,
      trackedDaysCount: 5,
      isEligible: true,
      targetSnapshot: {
        weeklyWorkoutGoal: 4,
        dailyProteinTarget: 140,
        dailyHydrationTarget: 3000,
      },
      displayNameSnapshot: "LB Tester",
      scoringVersion: 1,
      isFinalized: false,
      computedAt: new Date(),
    });

    const rebuiltCount = await rebuildRedisLeaderboard(currentWeek);
    expect(rebuiltCount).toBeGreaterThanOrEqual(1);

    const rankings = await getLeaderboardRankings(currentWeek, 10, 0);
    const userInRankings = rankings.entries.find((e) => e.userId === testUserId.toString());
    expect(userInRankings).toBeDefined();
    expect(userInRankings?.scoreBasisPoints).toBe(8550);
  });
});
