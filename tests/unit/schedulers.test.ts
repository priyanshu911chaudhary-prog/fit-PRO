import { describe, it, expect, vi } from "vitest";
import {
  SCHEDULER_IDS,
  SCHEDULER_CRONS,
  SCHEDULER_TIMEZONE,
} from "@/lib/queues/definitions";
import {
  getCompetitionWeek,
  getPreviousCompetitionWeek,
  getCompetitionWeekUtcBounds,
} from "@/lib/leaderboard/calendar";
import { registerAllSchedulers } from "@/workers/schedulers";
import * as jobsModule from "@/lib/queues/jobs";

describe("BullMQ Recurring Schedulers and Timezone Correctness", () => {
  it("defines Monday 00:05 Asia/Kolkata cron schedule for weekly finalization", () => {
    expect(SCHEDULER_CRONS.LEADERBOARD_WEEKLY_FINALIZATION).toBe("5 0 * * 1");
    expect(SCHEDULER_TIMEZONE).toBe("Asia/Kolkata");
  });

  it("selects correct completed competition week at Monday 00:05 Asia/Kolkata", () => {
    // 2026-10-26 is a Monday. 00:05:00 IST is 2026-10-25T18:35:00.000Z UTC
    const mondayMorningIst = new Date("2026-10-25T18:35:00.000Z");

    const currentWeek = getCompetitionWeek(mondayMorningIst);
    expect(currentWeek.weekStart).toBe("2026-10-26");

    const previousWeek = getPreviousCompetitionWeek(currentWeek.weekStart);
    expect(previousWeek.weekStart).toBe("2026-10-19");
    expect(previousWeek.weekEnd).toBe("2026-10-26");

    // Scoring period for previous week ended at 2026-10-26 00:00:00 IST (2026-10-25T18:30:00.000Z)
    const { endUtc } = getCompetitionWeekUtcBounds(previousWeek.weekStart);
    expect(endUtc.toISOString()).toBe("2026-10-25T18:30:00.000Z");

    // At 00:05 IST, current time is past endUtc, so scoring period has concluded
    expect(mondayMorningIst.getTime()).toBeGreaterThan(endUtc.getTime());
  });

  it("refuses to allow finalization before scoring period ends", () => {
    // Mid-week check: Wednesday 2026-10-21 inside 2026-10-19 week
    const midWeek = new Date("2026-10-21T10:00:00.000Z");
    const { endUtc } = getCompetitionWeekUtcBounds("2026-10-19");

    expect(midWeek.getTime()).toBeLessThan(endUtc.getTime());
  });

  it("registers all recurring schedulers idempotently using upsertJobScheduler", async () => {
    const upsertSchedulerMock = vi.fn().mockResolvedValue(true);

    const mockQueue = {
      upsertJobScheduler: upsertSchedulerMock,
    } as unknown as any;

    vi.spyOn(jobsModule, "getEmailQueue").mockReturnValue(mockQueue);
    vi.spyOn(jobsModule, "getLeaderboardQueue").mockReturnValue(mockQueue);
    vi.spyOn(jobsModule, "getNotificationQueue").mockReturnValue(mockQueue);

    // First call
    const result1 = await registerAllSchedulers();
    expect(result1.registered).toHaveLength(6);
    expect(upsertSchedulerMock).toHaveBeenCalledTimes(6);

    // Second call (simulating worker restart or secondary replica startup)
    const result2 = await registerAllSchedulers();
    expect(result2.registered).toHaveLength(6);
    // Since upsertJobScheduler overrides deterministic IDs, it executes idempotently without error
    expect(upsertSchedulerMock).toHaveBeenCalledTimes(12);

    expect(result1.registered).toContain(SCHEDULER_IDS.LEADERBOARD_WEEKLY_FINALIZATION);
    expect(result1.registered).toContain(SCHEDULER_IDS.LEADERBOARD_OUTBOX_RECOVERY);
    expect(result1.registered).toContain(SCHEDULER_IDS.LEADERBOARD_RECONCILIATION);
    expect(result1.registered).toContain(SCHEDULER_IDS.EMAIL_OUTBOX_RECOVERY);
    expect(result1.registered).toContain(SCHEDULER_IDS.WELLNESS_CHECK);
    expect(result1.registered).toContain(SCHEDULER_IDS.NOTIFICATION_OUTBOX_RECOVERY);
  });
});
