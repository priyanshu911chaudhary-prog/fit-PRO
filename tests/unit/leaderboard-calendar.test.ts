import { describe, it, expect } from "vitest";
import {
  getCompetitionWeek,
  getPreviousCompetitionWeek,
  getNextCompetitionWeek,
  getCompetitionWeekUtcBounds,
  formatCompetitionDate,
  COMPETITION_TIMEZONE,
} from "@/lib/leaderboard/calendar";

describe("Leaderboard Calendar (Unit Tests)", () => {
  it("formats dates in Asia/Kolkata timezone", () => {
    // 2026-10-25 18:30:00 UTC is exactly 2026-10-26 00:00:00 in Asia/Kolkata
    const d = new Date("2026-10-25T18:30:00.000Z");
    expect(formatCompetitionDate(d)).toBe("2026-10-26");

    // 2026-10-25 18:29:59 UTC is 2026-10-25 23:59:59 in Asia/Kolkata
    const dBefore = new Date("2026-10-25T18:29:59.000Z");
    expect(formatCompetitionDate(dBefore)).toBe("2026-10-25");
  });

  it("determines Monday-to-Monday week boundaries correctly", () => {
    // Wednesday 2026-10-28 12:00:00 UTC
    const ref = new Date("2026-10-28T12:00:00.000Z");
    const week = getCompetitionWeek(ref);

    expect(week.weekStart).toBe("2026-10-26"); // Monday
    expect(week.weekEnd).toBe("2026-11-02"); // Next Monday
    expect(week.days).toHaveLength(7);
    expect(week.days[0]).toBe("2026-10-26"); // Mon
    expect(week.days[1]).toBe("2026-10-27"); // Tue
    expect(week.days[2]).toBe("2026-10-28"); // Wed
    expect(week.days[3]).toBe("2026-10-29"); // Thu
    expect(week.days[4]).toBe("2026-10-30"); // Fri
    expect(week.days[5]).toBe("2026-10-31"); // Sat
    expect(week.days[6]).toBe("2026-11-01"); // Sun
  });

  it("treats Sunday as the last day of the competition week", () => {
    // Sunday 2026-11-01 at 12:00:00 UTC is Sunday in IST
    const sunday = new Date("2026-11-01T12:00:00.000Z");
    const week = getCompetitionWeek(sunday);

    expect(week.weekStart).toBe("2026-10-26");
    expect(week.weekEnd).toBe("2026-11-02");
    expect(week.days[6]).toBe("2026-11-01");
  });

  it("treats Monday at midnight IST as the start of a new competition week", () => {
    // Monday 2026-11-02 00:00:00 IST = 2026-11-01 18:30:00 UTC
    const mondayStart = new Date("2026-11-01T18:30:00.000Z");
    const week = getCompetitionWeek(mondayStart);

    expect(week.weekStart).toBe("2026-11-02");
    expect(week.weekEnd).toBe("2026-11-09");
  });

  it("computes previous and next competition weeks correctly", () => {
    const prev = getPreviousCompetitionWeek("2026-10-26");
    expect(prev.weekStart).toBe("2026-10-19");
    expect(prev.weekEnd).toBe("2026-10-26");

    const next = getNextCompetitionWeek("2026-10-26");
    expect(next.weekStart).toBe("2026-11-02");
    expect(next.weekEnd).toBe("2026-11-09");
  });

  it("computes exact UTC query bounds for a competition week", () => {
    const bounds = getCompetitionWeekUtcBounds("2026-10-26");
    // Monday 00:00:00 IST is Sunday 18:30:00 UTC
    expect(bounds.startUtc.toISOString()).toBe("2026-10-25T18:30:00.000Z");
    // Following Monday 00:00:00 IST is Sunday 18:30:00 UTC
    expect(bounds.endUtc.toISOString()).toBe("2026-11-01T18:30:00.000Z");
  });
});
