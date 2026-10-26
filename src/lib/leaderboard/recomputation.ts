import mongoose from "mongoose";
import { getCompetitionWeek, getCompetitionWeekUtcBounds, formatCompetitionDate } from "./calendar";
import { resolveUserTargets } from "./targets";
import { calculateWeeklyFitScore, isQualifyingWorkout, RawWeeklyActivityData } from "./scoring";
import { updateRedisLeaderboardScore, removeRedisLeaderboardParticipant } from "./redis-ranking";
import { WorkoutLog } from "@/models/workoutLog";
import { MealLog } from "@/models/mealLog";
import { WaterLog } from "@/models/waterLog";
import { User } from "@/models/user";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { LeaderboardOutbox } from "@/models/leaderboardOutbox";
import { LeaderboardWeekStatus } from "@/models/leaderboardWeekStatus";
import { logger } from "@/lib/logger";

/**
 * Recalculates a user's Weekly Fit Score, persists the result in MongoDB,
 * and updates their Redis sorted-set ranking.
 * Non-blocking: failures are queued into LeaderboardOutbox for recovery.
 * Includes concurrency guards so older calculations cannot overwrite newer scores.
 */
export async function recalculateUserWeeklyScore(
  userIdInput: string | mongoose.Types.ObjectId,
  targetWeekStart?: string
): Promise<void> {
  const userId = typeof userIdInput === "string" ? new mongoose.Types.ObjectId(userIdInput) : userIdInput;
  const { weekStart, weekEnd, days } = targetWeekStart
    ? { weekStart: targetWeekStart, weekEnd: getCompetitionWeek(targetWeekStart).weekEnd, days: getCompetitionWeek(targetWeekStart).days }
    : getCompetitionWeek();

  const computationStartedAt = new Date();

  try {
    // 1. Check if the week is already finalized. If finalized, historical scores are immutable!
    const weekStatus = await LeaderboardWeekStatus.findOne({ weekStart });
    if (weekStatus?.isFinalized) {
      logger.info("Skipping recomputation for finalized competition week", {
        userId: userId.toString(),
        weekStart,
      });
      return;
    }

    const existingEntry = await WeeklyLeaderboardEntry.findOne({ user: userId, weekStart });
    if (existingEntry?.isFinalized) {
      logger.info("User's weekly entry is finalized and immutable", {
        userId: userId.toString(),
        weekStart,
      });
      return;
    }

    // 2. Fetch targets and user settings
    const [settings, user, targets] = await Promise.all([
      LeaderboardSettings.findOne({ user: userId }),
      User.findById(userId).select("fullName"),
      resolveUserTargets(userId, weekStart),
    ]);

    if (!user) {
      throw new Error(`User not found: ${userId.toString()}`);
    }

    // 3. Query all workouts in the scoring week
    // UTC bounds provide boundary safeguard; date string matches competition day
    const { startUtc, endUtc } = getCompetitionWeekUtcBounds(weekStart);
    const workouts = await WorkoutLog.find({
      user: userId,
      $or: [
        { date: { $in: days } },
        { createdAt: { $gte: startUtc, $lt: endUtc } },
      ],
    });

    let qualifyingWorkoutsCount = 0;
    const activeDays = new Set<string>();

    for (const w of workouts) {
      const workoutDay = w.date || formatCompetitionDate(w.createdAt);
      if (days.includes(workoutDay)) {
        activeDays.add(workoutDay);
        if (isQualifyingWorkout(w)) {
          qualifyingWorkoutsCount++;
        }
      }
    }

    // 4. Query all meal logs in the scoring week and aggregate daily protein
    const meals = await MealLog.find({
      user: userId,
      $or: [
        { consumedDate: { $in: days } },
        { createdAt: { $gte: startUtc, $lt: endUtc } },
      ],
    });

    const dailyProtein: Record<string, number> = {};
    for (const m of meals) {
      const mealDay = m.consumedDate || formatCompetitionDate(m.createdAt);
      if (days.includes(mealDay)) {
        activeDays.add(mealDay);
        const protein = Number(m.totalProtein) || 0;
        dailyProtein[mealDay] = (dailyProtein[mealDay] || 0) + protein;
      }
    }

    // 5. Query all water logs in the scoring week and aggregate daily water
    const waterLogs = await WaterLog.find({
      user: userId,
      $or: [
        { date: { $gte: startUtc, $lt: endUtc } },
        { createdAt: { $gte: startUtc, $lt: endUtc } },
      ],
    });

    const dailyWater: Record<string, number> = {};
    for (const wl of waterLogs) {
      const waterDate = wl.date || wl.createdAt;
      const waterDay = formatCompetitionDate(waterDate);
      if (days.includes(waterDay)) {
        activeDays.add(waterDay);
        const amount = Number(wl.amountMl) || 0;
        dailyWater[waterDay] = (dailyWater[waterDay] || 0) + amount;
      }
    }

    // 6. Compute score breakdown
    const activityData: RawWeeklyActivityData = {
      scoringDays: days,
      qualifyingWorkoutsCount,
      dailyProtein,
      dailyWater,
      activeDays,
    };

    const breakdown = calculateWeeklyFitScore(activityData, targets);

    // 7. Resolve display name snapshot
    const displayNameSnapshot =
      settings?.displayName?.trim() ||
      user?.fullName?.trim() ||
      "Athlete";

    // 8. Durable MongoDB Upsert with concurrency guard
    // We update only if the existing record was computed at or before our calculation started
    const updateResult = await WeeklyLeaderboardEntry.updateOne(
      {
        user: userId,
        weekStart,
        $or: [
          { computedAt: { $lte: computationStartedAt } },
          { computedAt: { $exists: false } },
        ],
      },
      {
        $set: {
          weekEnd,
          scoreBasisPoints: breakdown.scoreBasisPoints,
          displayScore: breakdown.displayScore,
          workoutComponent: breakdown.workoutAttainment,
          proteinComponent: breakdown.proteinAttainment,
          hydrationComponent: breakdown.hydrationAttainment,
          qualifyingWorkoutsCount: breakdown.qualifyingWorkoutsCount,
          trackedDaysCount: breakdown.trackedDaysCount,
          isEligible: breakdown.isEligible && (settings?.optIn ?? false),
          ineligibilityReason: !settings?.optIn
            ? "Not opted in to public leaderboard"
            : breakdown.ineligibilityReason,
          targetSnapshot: {
            weeklyWorkoutGoal: targets.weeklyWorkoutGoal,
            dailyProteinTarget: targets.dailyProteinTarget,
            dailyHydrationTarget: targets.dailyHydrationTarget,
          },
          displayNameSnapshot,
          scoringVersion: 1,
          isFinalized: false,
          computedAt: computationStartedAt,
        },
      }
    );

    let isSuperseded = false;
    if (updateResult.matchedCount === 0) {
      // Either document doesn't exist yet, OR an existing document has a strictly newer computedAt
      const existing = await WeeklyLeaderboardEntry.findOne({ user: userId, weekStart });
      if (existing) {
        if (existing.computedAt > computationStartedAt) {
          isSuperseded = true;
          logger.info("Skipping write of superseded score computation", {
            userId: userId.toString(),
            weekStart,
          });
        }
      } else {
        // First entry for this user and week: insert safely
        await WeeklyLeaderboardEntry.create({
          user: userId,
          weekStart,
          weekEnd,
          scoreBasisPoints: breakdown.scoreBasisPoints,
          displayScore: breakdown.displayScore,
          workoutComponent: breakdown.workoutAttainment,
          proteinComponent: breakdown.proteinAttainment,
          hydrationComponent: breakdown.hydrationAttainment,
          qualifyingWorkoutsCount: breakdown.qualifyingWorkoutsCount,
          trackedDaysCount: breakdown.trackedDaysCount,
          isEligible: breakdown.isEligible && (settings?.optIn ?? false),
          ineligibilityReason: !settings?.optIn
            ? "Not opted in to public leaderboard"
            : breakdown.ineligibilityReason,
          targetSnapshot: {
            weeklyWorkoutGoal: targets.weeklyWorkoutGoal,
            dailyProteinTarget: targets.dailyProteinTarget,
            dailyHydrationTarget: targets.dailyHydrationTarget,
          },
          displayNameSnapshot,
          scoringVersion: 1,
          isFinalized: false,
          computedAt: computationStartedAt,
        }).catch((err) => {
          if (err.code !== 11000) throw err;
        });
      }
    }

    // 9. Update Redis sorted set ONLY if this calculation was not superseded
    if (!isSuperseded) {
      const shouldRank = (settings?.optIn ?? false) && breakdown.isEligible;
      if (shouldRank) {
        await updateRedisLeaderboardScore(weekStart, userId.toString(), breakdown.scoreBasisPoints);
      } else {
        await removeRedisLeaderboardParticipant(weekStart, userId.toString());
      }
    }

    // 10. Clear any pending outbox entry for this user and week
    await LeaderboardOutbox.deleteMany({
      user: userId,
      weekStart,
      status: "pending",
    }).catch(() => {});
  } catch (error) {
    logger.error(
      "Error during weekly score recomputation; queueing outbox recovery job",
      { userId: userId.toString(), weekStart, error: (error as Error).message }
    );

    // Enqueue outbox job so failure is durable and recoverable
    await LeaderboardOutbox.findOneAndUpdate(
      { user: userId, weekStart },
      {
        $setOnInsert: { attempts: 0 },
        $set: {
          lastError: (error as Error).message,
          status: "pending",
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ).catch(() => {});

    throw error;
  }
}

/**
 * Safely finalizes a completed competition week with an atomic guard.
 * Rules enforced:
 * 1. Cannot occur before scoring period has concluded.
 * 2. Cannot publish winners while unresolved recalculation outbox jobs exist.
 * 3. Idempotent under retries.
 * 4. Preserves historical winners immutably.
 */
export async function finalizeCompetitionWeek(weekStart: string): Promise<boolean> {
  const { weekEnd } = getCompetitionWeek(weekStart);

  // 1. Guard: Cannot finalize before the scoring period ends
  const { endUtc } = getCompetitionWeekUtcBounds(weekStart);
  if (new Date() < endUtc) {
    logger.warn("Cannot finalize competition week before scoring period ends", {
      weekStart,
      endUtc: endUtc.toISOString(),
    });
    return false;
  }

  // 2. Guard: Check if week is already finalized
  const existingStatus = await LeaderboardWeekStatus.findOne({ weekStart });
  if (existingStatus?.isFinalized) {
    return false; // Already finalized: idempotent
  }

  // 3. Resolve pending outbox recalculations before publishing final results
  await processLeaderboardOutbox(50);
  const pendingCount = await LeaderboardOutbox.countDocuments({
    weekStart,
    status: { $in: ["pending", "processing"] },
    attempts: { $lt: 5 },
  });
  if (pendingCount > 0) {
    logger.warn("Cannot finalize week while unresolved recalculation jobs remain in outbox", {
      weekStart,
      pendingCount,
    });
    return false;
  }

  const now = new Date();

  // 4. Mark all entries for this week as finalized
  await WeeklyLeaderboardEntry.updateMany(
    { weekStart },
    { $set: { isFinalized: true, finalizedAt: now } }
  );

  const [totalParticipants, eligibleParticipants] = await Promise.all([
    WeeklyLeaderboardEntry.countDocuments({ weekStart }),
    WeeklyLeaderboardEntry.countDocuments({ weekStart, isEligible: true }),
  ]);

  // 5. Atomically transition week status
  const finalizedDoc = await LeaderboardWeekStatus.findOneAndUpdate(
    { weekStart, isFinalized: { $ne: true } },
    {
      $set: {
        weekEnd,
        isFinalized: true,
        finalizedAt: now,
        totalParticipants,
        eligibleParticipants,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  if (!finalizedDoc) {
    return false;
  }

  logger.info("Competition week successfully finalized", {
    weekStart,
    totalParticipants,
    eligibleParticipants,
  });

  return true;
}

/**
 * Outbox processor to recover failed recomputations.
 * Atomically claims pending jobs one by one to prevent duplicate processing by concurrent workers.
 * Retries are strictly bounded to 5 attempts.
 */
export async function processLeaderboardOutbox(maxJobs = 50): Promise<number> {
  let processedCount = 0;

  for (let i = 0; i < maxJobs; i++) {
    // Atomically claim one pending job
    const job = await LeaderboardOutbox.findOneAndUpdate(
      {
        status: "pending",
        attempts: { $lt: 5 },
      },
      {
        $set: { status: "processing" },
        $inc: { attempts: 1 },
      },
      { returnDocument: "after" }
    );

    if (!job) {
      break; // No more pending jobs
    }

    try {
      await recalculateUserWeeklyScore(job.user, job.weekStart);
      await LeaderboardOutbox.deleteOne({ _id: job._id }).catch(() => {});
      processedCount++;
    } catch (err) {
      await LeaderboardOutbox.updateOne(
        { _id: job._id },
        {
          $set: {
            status: job.attempts >= 5 ? "failed" : "pending",
            lastError: (err as Error).message,
          },
        }
      ).catch(() => {});
    }
  }

  return processedCount;
}
