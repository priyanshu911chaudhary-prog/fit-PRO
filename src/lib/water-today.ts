import { WaterLog } from "@/models/waterLog";
import { formatInTimezone, getDayBoundsInTimezone } from "@/lib/timezone";
import { resolveUserTargets } from "@/lib/leaderboard/targets";

export async function getWaterToday(userId: string, timeZone: string) {
  const { startOfDay, endOfDay, todayStr } = getDayBoundsInTimezone(timeZone);
  const window = { $gte: startOfDay, $lte: endOfDay };
  const [candidates, targets] = await Promise.all([
    WaterLog.find({
      user: userId,
      $or: [{ date: window }, { date: null, createdAt: window }],
    }).sort({ date: -1, createdAt: -1 }).lean(),
    resolveUserTargets(userId),
  ]);
  const logs = candidates.filter((log) => formatInTimezone(log.date ?? log.createdAt, timeZone) === todayStr);
  const totalMl = logs.reduce((sum, log) => sum + Number(log.amountMl ?? (log as { amount?: number }).amount ?? 0), 0);
  return { totalMl, todayStr, targetAmount: targets.dailyHydrationTarget, logs };
}
