import { NotificationCategory, NotificationType } from "@/models/notification";
import { formatInTimezone } from "@/lib/timezone";

/**
 * Authoritative Thresholds for the Smart Fitness Nudge Engine.
 * Configured as named constants to ensure testability and prevent magic numbers.
 */
export const DAILY_CHECKIN_HYDRATION_THRESHOLD = 0.60; // 60%
export const DAILY_CHECKIN_PROTEIN_THRESHOLD = 0.70; // 70%

export const MAX_PROACTIVE_CHECKINS_PER_LOCAL_DAY = 1;
export const MAX_ACHIEVEMENTS_PER_LOCAL_DAY = 1;
export const MAX_EXTERNAL_NOTIFICATIONS_PER_LOCAL_DAY = 2;

export interface DailyCheckInEvaluationInput {
  userId: string;
  localDate: string; // YYYY-MM-DD
  currentTime: string; // HH:mm
  timezone: string;
  preferences: {
    proactiveNudgesEnabled: boolean;
    categories: {
      hydration: boolean;
      workout: boolean;
      nutrition: boolean;
    };
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  targets: {
    dailyHydrationTarget: number; // ml
    dailyProteinTarget: number; // grams
    weeklyWorkoutGoal: number;
  };
  activity: {
    loggedWaterMl: number;
    loggedProteinGrams: number;
    mealCount: number;
    hasQualifyingWorkoutToday: boolean;
    hasWorkoutScheduledToday: boolean;
  };
  todayNotificationCounts: {
    proactiveCheckIns: number;
    externalDeliveries: number;
  };
}

export interface ProposedNotification {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  destinationUrl: string;
  dedupeKey: string;
  metadata: Record<string, unknown>;
}

/**
 * Checks if a given HH:mm time string falls within configured quiet hours.
 * Properly supports quiet hours that span across midnight (e.g. 21:00 to 08:00).
 */
export function isQuietHours(
  timeStr: string,
  quietHours: { enabled: boolean; start: string; end: string }
): boolean {
  if (!quietHours.enabled) return false;
  const { start, end } = quietHours;
  if (!start || !end || start === end) return false;

  if (start < end) {
    // Single day window (e.g. 01:00 - 06:00)
    return timeStr >= start && timeStr < end;
  } else {
    // Spanning midnight (e.g. 21:00 - 08:00)
    return timeStr >= start || timeStr < end;
  }
}

/**
 * Formats a Date object to "HH:mm" in the specified IANA timezone.
 */
export function formatLocalTime(date: Date = new Date(), timeZone = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return formatter.format(date);
  } catch {
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const mins = String(date.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  }
}

/**
 * Returns normalized lowercase weekday name for a Date in the specified timezone.
 * "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday"
 */
export function getLocalWeekday(date: Date = new Date(), timeZone = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
    });
    return formatter.format(date).toLowerCase();
  } catch {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[date.getUTCDay()];
  }
}

/**
 * Validates whether an IANA timezone identifier is valid on this runtime.
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts a wall-clock local date and time in an IANA timezone to a UTC Date.
 * Properly accounts for timezone offsets and daylight saving transitions.
 */
export function localToUtcDate(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone = "UTC"
): Date {
  let guessUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(guessUtc);

    const m = Number(parts.find((p) => p.type === "month")?.value);
    const d = Number(parts.find((p) => p.type === "day")?.value);
    const y = Number(parts.find((p) => p.type === "year")?.value);
    let h = Number(parts.find((p) => p.type === "hour")?.value);
    if (h === 24) h = 0;
    const min = Number(parts.find((p) => p.type === "minute")?.value);

    const desiredMs = Date.UTC(year, month - 1, day, hour, minute);
    const actualMs = Date.UTC(y, m - 1, d, h, min);
    const diffMs = desiredMs - actualMs;

    if (diffMs === 0) {
      return guessUtc;
    }
    guessUtc = new Date(guessUtc.getTime() + diffMs);
  }

  return guessUtc;
}

/**
 * Calculates the exact UTC Date of the next scheduled check-in for a user in their timezone.
 * If today's check-in time has already passed relative to afterDate, schedules for the next local day.
 */
export function calculateNextCheckInTime(
  timezone = "Asia/Kolkata",
  checkInTime = "18:00",
  afterDate = new Date()
): Date {
  const safeTz = isValidTimezone(timezone) ? timezone : "Asia/Kolkata";
  const [hour, minute] = checkInTime.split(":").map(Number);
  const targetHour = isNaN(hour) ? 18 : hour;
  const targetMin = isNaN(minute) ? 0 : minute;

  const todayStr = formatInTimezone(afterDate, safeTz);
  const [year, month, day] = todayStr.split("-").map(Number);

  const todayCandidate = localToUtcDate(year, month, day, targetHour, targetMin, safeTz);

  // If today's check-in is still in the future, return it
  if (todayCandidate.getTime() > afterDate.getTime()) {
    return todayCandidate;
  }

  // Otherwise, schedule for tomorrow's date in user's timezone
  const tomorrowApprox = new Date(todayCandidate.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = formatInTimezone(tomorrowApprox, safeTz);
  const [nextYear, nextMonth, nextDay] = tomorrowStr.split("-").map(Number);

  return localToUtcDate(nextYear, nextMonth, nextDay, targetHour, targetMin, safeTz);
}

/**
 * Evaluates the Smart Daily Check-In rules for a user at their scheduled time.
 * Returns at most one primary nudge according to strict priority or null if no message.
 */
export function evaluateDailyCheckIn(
  input: DailyCheckInEvaluationInput
): ProposedNotification | null {
  const {
    userId,
    localDate,
    preferences,
    targets,
    activity,
    todayNotificationCounts,
  } = input;

  // 1. Check master preferences and daily frequency caps
  if (!preferences.proactiveNudgesEnabled) {
    return null;
  }

  if (todayNotificationCounts.proactiveCheckIns >= MAX_PROACTIVE_CHECKINS_PER_LOCAL_DAY) {
    return null;
  }

  const { loggedWaterMl, loggedProteinGrams, mealCount, hasQualifyingWorkoutToday, hasWorkoutScheduledToday } = activity;
  const { dailyHydrationTarget, dailyProteinTarget } = targets;

  // Priority 1: Hydration
  if (
    preferences.categories.hydration !== false &&
    dailyHydrationTarget > 0 &&
    loggedWaterMl < dailyHydrationTarget * DAILY_CHECKIN_HYDRATION_THRESHOLD
  ) {
    return {
      type: "hydration_nudge",
      category: "hydration",
      title: "Hydration Check-in",
      body: `You're at ${Math.round(loggedWaterMl)} of ${Math.round(dailyHydrationTarget)} ml of your hydration goal today. Check your progress and log your next glass.`,
      destinationUrl: "/water",
      dedupeKey: `${userId}:daily_checkin:${localDate}`,
      metadata: {
        loggedValue: loggedWaterMl,
        targetValue: dailyHydrationTarget,
        localDate,
      },
    };
  }

  // Priority 2: Workout
  if (
    preferences.categories.workout !== false &&
    hasWorkoutScheduledToday &&
    !hasQualifyingWorkoutToday
  ) {
    return {
      type: "workout_nudge",
      category: "workout",
      title: "Workout Reminder",
      body: "Your workout plan has a session lined up today. Want to adapt it to your time and energy? Your AI Coach can help.",
      destinationUrl: "/coach?intent=adjust-workout",
      dedupeKey: `${userId}:daily_checkin:${localDate}`,
      metadata: {
        intent: "adjust-workout",
        localDate,
      },
    };
  }

  // Priority 3: Nutrition
  if (
    preferences.categories.nutrition !== false &&
    dailyProteinTarget > 0 &&
    mealCount >= 1 &&
    loggedProteinGrams < dailyProteinTarget * DAILY_CHECKIN_PROTEIN_THRESHOLD
  ) {
    return {
      type: "nutrition_nudge",
      category: "nutrition",
      title: "Nutrition Check-in",
      body: `You've logged ${Math.round(loggedProteinGrams)} g of your ${Math.round(dailyProteinTarget)} g protein target so far. Your AI Coach can help you explore meal ideas.`,
      destinationUrl: "/coach?intent=protein-ideas",
      dedupeKey: `${userId}:daily_checkin:${localDate}`,
      metadata: {
        intent: "protein-ideas",
        loggedValue: loggedProteinGrams,
        targetValue: dailyProteinTarget,
        localDate,
      },
    };
  }

  // Priority 4: No meaningful action needed
  return null;
}

export interface ActivityAchievementInput {
  userId: string;
  localDate: string; // YYYY-MM-DD
  eventType: "water" | "meal" | "workout";
  targets: {
    dailyHydrationTarget: number;
    dailyProteinTarget: number;
    weeklyWorkoutGoal: number;
  };
  activity: {
    cumulativeWaterMl: number;
    cumulativeProteinGrams: number;
    todayMealCount: number;
    isQualifyingWorkout: boolean;
  };
  preferences: {
    achievementsEnabled: boolean;
    categories: {
      hydration: boolean;
      workout: boolean;
      nutrition: boolean;
    };
  };
}

/**
 * Evaluates event-driven activity updates to detect newly unlocked milestones.
 */
export function evaluateActivityAchievement(
  input: ActivityAchievementInput
): ProposedNotification | null {
  const { userId, localDate, eventType, targets, activity, preferences } = input;

  if (!preferences.achievementsEnabled) {
    return null;
  }

  if (eventType === "water") {
    if (
      preferences.categories.hydration !== false &&
      targets.dailyHydrationTarget > 0 &&
      activity.cumulativeWaterMl >= targets.dailyHydrationTarget
    ) {
      return {
        type: "hydration_goal",
        category: "hydration",
        title: "Hydration Goal Reached!",
        body: "Nice work! You've reached your hydration goal for today.",
        destinationUrl: "/water",
        dedupeKey: `${userId}:hydration_goal:${localDate}`,
        metadata: {
          loggedValue: activity.cumulativeWaterMl,
          targetValue: targets.dailyHydrationTarget,
          localDate,
        },
      };
    }
  }

  if (eventType === "meal") {
    if (
      preferences.categories.nutrition !== false &&
      targets.dailyProteinTarget > 0 &&
      activity.cumulativeProteinGrams >= targets.dailyProteinTarget
    ) {
      const isConsistentThreeMeals = activity.todayMealCount >= 3;
      const body = isConsistentThreeMeals
        ? "Nice consistency! You logged three meals today and reached your protein target."
        : "Great consistency — your logged protein has reached today's target.";

      return {
        type: "protein_goal",
        category: "nutrition",
        title: "Protein Target Reached!",
        body,
        destinationUrl: "/meal",
        dedupeKey: `${userId}:protein_goal:${localDate}`,
        metadata: {
          loggedValue: activity.cumulativeProteinGrams,
          targetValue: targets.dailyProteinTarget,
          mealCount: activity.todayMealCount,
          localDate,
        },
      };
    }
  }

  if (eventType === "workout") {
    if (
      preferences.categories.workout !== false &&
      activity.isQualifyingWorkout
    ) {
      return {
        type: "workout_progress",
        category: "workout",
        title: "Workout Logged!",
        body: "Workout logged! You're making progress toward your weekly workout goal.",
        destinationUrl: "/workout",
        dedupeKey: `${userId}:workout_progress:${localDate}`,
        metadata: {
          isQualifying: true,
          localDate,
        },
      };
    }
  }

  return null;
}
