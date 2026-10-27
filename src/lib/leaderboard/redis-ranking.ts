import { getRedisClient } from "@/lib/redis/client";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { LeaderboardParticipantRank } from "./types";
import { logger } from "@/lib/logger";

export const LEADERBOARD_REDIS_TTL = 30 * 24 * 60 * 60; // 30 days

export function getLeaderboardRedisKey(weekStart: string): string {
  return `leaderboard:weekly:${weekStart}`;
}

/**
 * Assigns standard competition ranking (1, 1, 3) to an array of sorted participants.
 */
export function assignCompetitionRanks<
  T extends { scoreBasisPoints: number; rank?: number; displayName?: string; userId?: string }
>(sortedEntries: T[], baseOffset = 0): (T & { rank: number })[] {
  if (sortedEntries.length === 0) return [];

  const ranked: (T & { rank: number })[] = [];
  let currentRank = 1 + baseOffset;

  for (let i = 0; i < sortedEntries.length; i++) {
    if (i > 0) {
      if (sortedEntries[i].scoreBasisPoints === sortedEntries[i - 1].scoreBasisPoints) {
        // Tied with previous participant: keep same rank
        ranked.push({
          ...sortedEntries[i],
          rank: ranked[i - 1].rank,
        });
        continue;
      } else {
        // New lower score: rank accounts for all preceding positions
        currentRank = i + 1 + baseOffset;
      }
    }
    ranked.push({
      ...sortedEntries[i],
      rank: currentRank,
    });
  }

  return ranked;
}

/**
 * Updates or sets a participant's score in the Redis sorted set.
 */
export async function updateRedisLeaderboardScore(
  weekStart: string,
  userId: string,
  scoreBasisPoints: number
): Promise<void> {
  const redis = getRedisClient();
  const key = getLeaderboardRedisKey(weekStart);

  try {
    await redis.zadd(key, scoreBasisPoints, userId);
    await redis.expire(key, LEADERBOARD_REDIS_TTL);
  } catch (error) {
    logger.warn(
      "Failed to update Redis leaderboard ranking (will rely on MongoDB)",
      { weekStart, userId, error: (error as Error).message }
    );
  }
}

/**
 * Removes a participant from the active Redis sorted set (e.g. opt-out or ineligible).
 */
export async function removeRedisLeaderboardParticipant(
  weekStart: string,
  userId: string
): Promise<void> {
  const redis = getRedisClient();
  const key = getLeaderboardRedisKey(weekStart);

  try {
    await redis.zrem(key, userId);
  } catch (error) {
    logger.warn(
      "Failed to remove participant from Redis leaderboard",
      { weekStart, userId, error: (error as Error).message }
    );
  }
}

/**
 * Rebuilds the Redis sorted set from durable MongoDB records for a given week.
 * Protected by distributed lock and atomic rename to prevent race conditions
 * or intermediate empty states while re-ranking.
 */
export async function rebuildRedisLeaderboard(weekStart: string): Promise<number> {
  const redis = getRedisClient();
  const key = getLeaderboardRedisKey(weekStart);
  const lockKey = `lock:leaderboard:reconcile:${weekStart}`;
  const tempKey = `${key}:reconcile:${Date.now()}`;

  // Acquire concurrency lock (30s TTL) to prevent conflicting parallel rebuilds
  let acquiredLock = false;
  try {
    const lockResult = await redis.set(lockKey, "locked", "PX", 30000, "NX");
    if (!lockResult) {
      logger.warn("Reconciliation skipped: another rebuild is already in progress", { weekStart });
      return 0;
    }
    acquiredLock = true;
  } catch (err) {
    // If Redis lock fails, proceed with caution or log warning
    logger.warn("Could not acquire reconciliation lock; proceeding with fallback", {
      weekStart,
      error: (err as Error).message,
    });
  }

  try {
    const eligibleEntries = await WeeklyLeaderboardEntry.find({
      weekStart,
      isEligible: true,
    }).select("user scoreBasisPoints");

    if (eligibleEntries.length === 0) {
      try {
        await redis.del(key);
      } catch {
        // safe fallback
      }
      return 0;
    }

    try {
      // Rebuild into temporary key first to ensure atomic replacement
      const pipeline = redis.pipeline();
      for (const entry of eligibleEntries) {
        pipeline.zadd(tempKey, entry.scoreBasisPoints, entry.user.toString());
      }
      pipeline.expire(tempKey, LEADERBOARD_REDIS_TTL);
      await pipeline.exec();

      // Atomically replace the active key
      await redis.rename(tempKey, key);
      return eligibleEntries.length;
    } catch (error) {
      // Clean up temp key on error if possible
      await redis.del(tempKey).catch(() => {});
      logger.warn(
        "Failed to rebuild Redis leaderboard; serving from MongoDB",
        { weekStart, error: (error as Error).message }
      );
      return eligibleEntries.length;
    }
  } finally {
    if (acquiredLock) {
      await redis.del(lockKey).catch(() => {});
    }
  }
}

/**
 * Retrieves the rank and score for a specific user using standard competition ranking.
 * In competition ranking, Rank = 1 + count of members with score strictly greater than user's.
 */
export async function getUserLeaderboardRank(
  weekStart: string,
  userId: string
): Promise<{
  rank: number | null;
  scoreBasisPoints: number | null;
  displayScore: number | null;
}> {
  const redis = getRedisClient();
  const key = getLeaderboardRedisKey(weekStart);

  try {
    const rawScore = await redis.zscore(key, userId);
    if (rawScore === null || rawScore === undefined) {
      // Not in Redis set, check MongoDB
      return await getUserLeaderboardRankFromMongo(weekStart, userId);
    }

    const scoreBasisPoints = Number(rawScore);
    // Count how many participants have score > scoreBasisPoints
    const higherCount = await redis.zcount(key, `(${scoreBasisPoints}`, "+inf");
    const rank = higherCount + 1;

    return {
      rank,
      scoreBasisPoints,
      displayScore: +(scoreBasisPoints / 100).toFixed(2),
    };
  } catch {
    // Redis fallback
    return await getUserLeaderboardRankFromMongo(weekStart, userId);
  }
}

async function getUserLeaderboardRankFromMongo(
  weekStart: string,
  userId: string
): Promise<{
  rank: number | null;
  scoreBasisPoints: number | null;
  displayScore: number | null;
}> {
  const entry = await WeeklyLeaderboardEntry.findOne({
    weekStart,
    user: userId,
  });

  if (!entry || !entry.isEligible) {
    return {
      rank: null,
      scoreBasisPoints: entry ? entry.scoreBasisPoints : null,
      displayScore: entry ? entry.displayScore : null,
    };
  }

  // Count how many eligible participants have a strictly higher score
  const higherCount = await WeeklyLeaderboardEntry.countDocuments({
    weekStart,
    isEligible: true,
    scoreBasisPoints: { $gt: entry.scoreBasisPoints },
  });

  return {
    rank: higherCount + 1,
    scoreBasisPoints: entry.scoreBasisPoints,
    displayScore: entry.displayScore,
  };
}

/**
 * Retrieves the paginated leaderboard ranking list for a given week.
 * Resolves display names from MongoDB and assigns standard competition ranks (1, 1, 3).
 */
export async function getLeaderboardRankings(
  weekStart: string,
  limit = 20,
  offset = 0
): Promise<{
  entries: LeaderboardParticipantRank[];
  total: number;
}> {
  const redis = getRedisClient();
  const key = getLeaderboardRedisKey(weekStart);

  const userScores: { userId: string; score: number }[] = [];
  let total = 0;
  let usedRedis = false;

  try {
    total = await redis.zcard(key);
    if (total > 0) {
      // zrevrange with scores: [member1, score1, member2, score2, ...]
      const range = await redis.zrevrange(key, offset, offset + limit - 1, "WITHSCORES");
      for (let i = 0; i < range.length; i += 2) {
        userScores.push({
          userId: range[i],
          score: Number(range[i + 1]),
        });
      }
      usedRedis = true;
    }
  } catch (error) {
    logger.warn(
      "Redis error querying leaderboard; falling back to MongoDB",
      { weekStart, error: (error as Error).message }
    );
  }

  // Fallback to MongoDB if Redis was empty or failed
  if (!usedRedis || userScores.length === 0) {
    return await getLeaderboardRankingsFromMongo(weekStart, limit, offset);
  }

  // Enrich with display names and snapshot data from MongoDB
  const userIds = userScores.map((u) => u.userId);
  const entries = await WeeklyLeaderboardEntry.find({
    weekStart,
    user: { $in: userIds },
    isEligible: true,
  }).select("user displayNameSnapshot scoreBasisPoints displayScore");

  const entryMap = new Map(entries.map((e) => [e.user.toString(), e]));

  const enriched = userScores.map((u) => {
    const doc = entryMap.get(u.userId);
    return {
      userId: u.userId,
      displayName: doc?.displayNameSnapshot || "Athlete",
      scoreBasisPoints: u.score,
      displayScore: doc ? doc.displayScore : +(u.score / 100).toFixed(2),
      isEligible: true,
    };
  });

  // Calculate actual competition ranks accounting for ties and page offset
  // To get the exact starting rank of the first item at offset, query higher count
  let startingRankOffset = offset;
  if (enriched.length > 0) {
    try {
      const topScore = enriched[0].scoreBasisPoints;
      const countHigher = await redis.zcount(key, `(${topScore}`, "+inf");
      startingRankOffset = countHigher;
    } catch {
      // fallback
    }
  }

  const ranked = assignCompetitionRanks(enriched, startingRankOffset);

  return {
    entries: ranked,
    total,
  };
}

async function getLeaderboardRankingsFromMongo(
  weekStart: string,
  limit: number,
  offset: number
): Promise<{
  entries: LeaderboardParticipantRank[];
  total: number;
}> {
  const [total, docs] = await Promise.all([
    WeeklyLeaderboardEntry.countDocuments({ weekStart, isEligible: true }),
    WeeklyLeaderboardEntry.find({ weekStart, isEligible: true })
      .sort({ scoreBasisPoints: -1, displayNameSnapshot: 1, _id: 1 })
      .skip(offset)
      .limit(limit)
      .select("user displayNameSnapshot scoreBasisPoints displayScore"),
  ]);

  if (docs.length === 0) {
    return { entries: [], total };
  }

  // Find how many entries have a higher score than the first entry in this page
  const countHigher = await WeeklyLeaderboardEntry.countDocuments({
    weekStart,
    isEligible: true,
    scoreBasisPoints: { $gt: docs[0].scoreBasisPoints },
  });

  const formatted = docs.map((d) => ({
    userId: d.user.toString(),
    displayName: d.displayNameSnapshot || "Athlete",
    scoreBasisPoints: d.scoreBasisPoints,
    displayScore: d.displayScore,
    isEligible: true,
  }));

  const ranked = assignCompetitionRanks(formatted, countHigher);

  return {
    entries: ranked,
    total,
  };
}
