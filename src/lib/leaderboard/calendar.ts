/**
 * Fit-PRO Global Leaderboard Competition Calendar
 * Standardized on Asia/Kolkata (UTC+05:30).
 * Competition weeks run Monday 00:00:00 through following Monday 00:00:00 IST.
 */

export const COMPETITION_TIMEZONE = "Asia/Kolkata";
export const COMPETITION_TIMEZONE_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in ms

/**
 * Formats a Date or timestamp into YYYY-MM-DD in the competition timezone (Asia/Kolkata).
 */
export function formatCompetitionDate(date: Date | string | number = new Date()): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  // Use Intl.DateTimeFormat for robust timezone extraction
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPETITION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d); // Returns YYYY-MM-DD
}

/**
 * Returns the day of week index in Asia/Kolkata: 0 = Sun, 1 = Mon, ..., 6 = Sat
 */
function getCompetitionDayOfWeek(d: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: COMPETITION_TIMEZONE,
    weekday: "short",
  });
  const weekday = formatter.format(d);
  switch (weekday) {
    case "Sun":
      return 0;
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return 1;
  }
}

/**
 * Given any reference date, returns the competition week start (Monday) and week end (following Monday).
 */
export function getCompetitionWeek(refDate: Date | string | number = new Date()): {
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string; // YYYY-MM-DD (Next Monday)
  days: string[]; // 7 consecutive YYYY-MM-DD strings [Mon..Sun]
} {
  const d = refDate instanceof Date ? refDate : new Date(refDate);
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  // Find day of week in Asia/Kolkata
  const dayOfWeek = getCompetitionDayOfWeek(validDate);
  // Days to subtract to reach Monday:
  // If Mon (1) -> subtract 0
  // If Tue (2) -> subtract 1 ...
  // If Sun (0) -> subtract 6 (since Monday was 6 days ago)
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  // We can calculate the Monday date by shifting
  // To avoid local timezone shifts, operate with day arithmetic in competition timezone
  const todayStr = formatCompetitionDate(validDate);
  const [year, month, day] = todayStr.split("-").map(Number);
  
  // Construct a date in UTC representing midnight of todayStr
  const baseDate = new Date(Date.UTC(year, month - 1, day));
  baseDate.setUTCDate(baseDate.getUTCDate() - daysFromMonday);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(baseDate);
    dayDate.setUTCDate(baseDate.getUTCDate() + i);
    days.push(dayDate.toISOString().slice(0, 10));
  }

  const nextMondayDate = new Date(baseDate);
  nextMondayDate.setUTCDate(baseDate.getUTCDate() + 7);
  const weekEnd = nextMondayDate.toISOString().slice(0, 10);

  return {
    weekStart: days[0],
    weekEnd,
    days,
  };
}

/**
 * Returns the previous week bounds given a weekStart string (YYYY-MM-DD).
 */
export function getPreviousCompetitionWeek(weekStart: string): {
  weekStart: string;
  weekEnd: string;
  days: string[];
} {
  const [year, month, day] = weekStart.split("-").map(Number);
  const prevDate = new Date(Date.UTC(year, month - 1, day));
  prevDate.setUTCDate(prevDate.getUTCDate() - 7);
  return getCompetitionWeek(prevDate);
}

/**
 * Returns the next week bounds given a weekStart string (YYYY-MM-DD).
 */
export function getNextCompetitionWeek(weekStart: string): {
  weekStart: string;
  weekEnd: string;
  days: string[];
} {
  const [year, month, day] = weekStart.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day));
  nextDate.setUTCDate(nextDate.getUTCDate() + 7);
  return getCompetitionWeek(nextDate);
}

/**
 * Converts a competition week start (YYYY-MM-DD) into exact UTC timestamps for MongoDB querying.
 * Monday 00:00:00 in Asia/Kolkata = Sunday 18:30:00 UTC.
 * Following Monday 00:00:00 in Asia/Kolkata = following Sunday 18:30:00 UTC.
 */
export function getCompetitionWeekUtcBounds(weekStart: string): {
  startUtc: Date;
  endUtc: Date;
} {
  const [year, month, day] = weekStart.split("-").map(Number);
  // Monday 00:00:00.000 in UTC+5:30 is:
  // Date.UTC(year, month - 1, day, 0, 0, 0) - 5.5 hours = Sunday 18:30:00.000 UTC
  const startMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - COMPETITION_TIMEZONE_OFFSET_MS;
  // End of week is 7 full days later (following Monday 00:00:00.000 IST)
  const endMs = startMs + 7 * 24 * 60 * 60 * 1000;

  return {
    startUtc: new Date(startMs),
    endUtc: new Date(endMs),
  };
}
