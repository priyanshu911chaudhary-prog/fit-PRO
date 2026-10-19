/**
 * Timezone helpers for day-based operations (X-Timezone header)
 */

export function getUserTimezone(req: Request): string {
  const tzHeader = req.headers.get("x-timezone")?.trim();
  if (!tzHeader) return "UTC";

  try {
    // Validate whether timezone is a valid IANA identifier
    Intl.DateTimeFormat(undefined, { timeZone: tzHeader });
    return tzHeader;
  } catch {
    return "UTC";
  }
}

export function formatInTimezone(date: Date | string | number | undefined | null, timeZone = "UTC"): string {
  if (!date) {
    return new Date().toISOString().split("T")[0];
  }

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(d); // Output format: YYYY-MM-DD
  } catch {
    try {
      return d.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }
}

/**
 * Returns UTC Date range for the start and end of "today" in the specified timezone
 */
export function getDayBoundsInTimezone(timeZone = "UTC", targetDate = new Date()): {
  startOfDay: Date;
  endOfDay: Date;
  todayStr: string;
} {
  const todayStr = formatInTimezone(targetDate, timeZone);
  const [year, month, day] = todayStr.split("-").map(Number);

  // Approximate UTC window covering the entire timezone day (-14 to +14 offset)
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 14 * 60 * 60 * 1000);
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) + 14 * 60 * 60 * 1000);

  return { startOfDay, endOfDay, todayStr };
}
