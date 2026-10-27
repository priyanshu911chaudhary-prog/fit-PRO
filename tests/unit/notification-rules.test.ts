import { describe, it, expect } from "vitest";
import {
  isQuietHours,
  formatLocalTime,
  getLocalWeekday,
  isValidTimezone,
  evaluateDailyCheckIn,
  evaluateActivityAchievement,
  DAILY_CHECKIN_HYDRATION_THRESHOLD,
  DAILY_CHECKIN_PROTEIN_THRESHOLD,
} from "@/lib/notifications/rules";

describe("Notification Rules Engine — Unit Tests", () => {
  describe("Quiet Hours Logic", () => {
    it("returns false if quiet hours are disabled", () => {
      expect(isQuietHours("23:00", { enabled: false, start: "21:00", end: "08:00" })).toBe(false);
    });

    it("evaluates quiet hours spanning midnight correctly (e.g. 21:00 to 08:00)", () => {
      const quietConfig = { enabled: true, start: "21:00", end: "08:00" };

      expect(isQuietHours("21:00", quietConfig)).toBe(true);
      expect(isQuietHours("23:30", quietConfig)).toBe(true);
      expect(isQuietHours("03:15", quietConfig)).toBe(true);
      expect(isQuietHours("07:59", quietConfig)).toBe(true);

      // Outside quiet hours
      expect(isQuietHours("08:00", quietConfig)).toBe(false);
      expect(isQuietHours("12:00", quietConfig)).toBe(false);
      expect(isQuietHours("20:59", quietConfig)).toBe(false);
    });

    it("evaluates non-midnight quiet hours correctly (e.g. 01:00 to 06:00)", () => {
      const quietConfig = { enabled: true, start: "01:00", end: "06:00" };

      expect(isQuietHours("00:30", quietConfig)).toBe(false);
      expect(isQuietHours("01:00", quietConfig)).toBe(true);
      expect(isQuietHours("04:00", quietConfig)).toBe(true);
      expect(isQuietHours("06:00", quietConfig)).toBe(false);
    });
  });

  describe("Timezone & Date Helpers", () => {
    it("validates IANA timezones reliably", () => {
      expect(isValidTimezone("Asia/Kolkata")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("Mars/Curiosity")).toBe(false);
      expect(isValidTimezone("")).toBe(false);
    });

    it("formats local time and weekday correctly in specified timezone", () => {
      // 2026-10-27T08:30:00Z is 14:00:00 in Asia/Kolkata (IST = UTC+5:30)
      const date = new Date("2026-10-27T08:30:00Z");

      const timeIst = formatLocalTime(date, "Asia/Kolkata");
      expect(timeIst).toBe("14:00");

      const weekdayIst = getLocalWeekday(date, "Asia/Kolkata");
      expect(weekdayIst).toBe("tuesday");

      // In America/New_York (UTC-4 in EDT): 04:30
      const timeNy = formatLocalTime(date, "America/New_York");
      expect(timeNy).toBe("04:30");
    });
  });

  describe("Smart Daily Check-In Priority Rules", () => {
    const baseInput = {
      userId: "user-123",
      localDate: "2026-10-27",
      currentTime: "18:00",
      timezone: "Asia/Kolkata",
      preferences: {
        proactiveNudgesEnabled: true,
        categories: { hydration: true, workout: true, nutrition: true },
        quietHours: { enabled: true, start: "21:00", end: "08:00" },
      },
      targets: {
        dailyHydrationTarget: 2500, // ml
        dailyProteinTarget: 120, // g
        weeklyWorkoutGoal: 3,
      },
      activity: {
        loggedWaterMl: 1000,
        loggedProteinGrams: 50,
        mealCount: 1,
        hasQualifyingWorkoutToday: false,
        hasWorkoutScheduledToday: true,
      },
      todayNotificationCounts: {
        proactiveCheckIns: 0,
        externalDeliveries: 0,
      },
    };

    it("returns null if proactive nudges are disabled", () => {
      const input = {
        ...baseInput,
        preferences: { ...baseInput.preferences, proactiveNudgesEnabled: false },
      };
      expect(evaluateDailyCheckIn(input)).toBeNull();
    });

    it("returns null if user already received a proactive check-in today", () => {
      const input = {
        ...baseInput,
        todayNotificationCounts: { proactiveCheckIns: 1, externalDeliveries: 1 },
      };
      expect(evaluateDailyCheckIn(input)).toBeNull();
    });

    it("selects Priority 1 (Hydration) when logged water is below 60% of target", () => {
      // 1400 ml of 2500 ml is 56% (< 60%)
      const input = {
        ...baseInput,
        activity: { ...baseInput.activity, loggedWaterMl: 1400 },
      };
      const nudge = evaluateDailyCheckIn(input);
      expect(nudge).not.toBeNull();
      expect(nudge?.type).toBe("hydration_nudge");
      expect(nudge?.category).toBe("hydration");
      expect(nudge?.destinationUrl).toBe("/water");
      expect(nudge?.body).toContain("1400 of 2500 ml");
    });

    it("selects Priority 2 (Workout) when hydration is >= 60% and scheduled workout is missing", () => {
      // Hydration at 1600 ml (64% >= 60%)
      const input = {
        ...baseInput,
        activity: {
          ...baseInput.activity,
          loggedWaterMl: 1600,
          hasWorkoutScheduledToday: true,
          hasQualifyingWorkoutToday: false,
        },
      };
      const nudge = evaluateDailyCheckIn(input);
      expect(nudge).not.toBeNull();
      expect(nudge?.type).toBe("workout_nudge");
      expect(nudge?.category).toBe("workout");
      expect(nudge?.destinationUrl).toBe("/coach?intent=adjust-workout");
      expect(nudge?.body).toContain("Your workout plan has a session lined up today");
    });

    it("selects Priority 3 (Nutrition) when hydration and workout are satisfied but protein is < 70%", () => {
      // Hydration: 2500ml (100%), Workout completed, Protein: 60g / 120g (50% < 70%), 2 meals logged
      const input = {
        ...baseInput,
        activity: {
          loggedWaterMl: 2500,
          loggedProteinGrams: 60,
          mealCount: 2,
          hasWorkoutScheduledToday: true,
          hasQualifyingWorkoutToday: true,
        },
      };
      const nudge = evaluateDailyCheckIn(input);
      expect(nudge).not.toBeNull();
      expect(nudge?.type).toBe("nutrition_nudge");
      expect(nudge?.category).toBe("nutrition");
      expect(nudge?.destinationUrl).toBe("/coach?intent=protein-ideas");
      expect(nudge?.body).toContain("60 g of your 120 g protein target");
    });

    it("returns null when all relevant targets are satisfied or no action needed", () => {
      // Hydration 100%, Workout done, Protein 100g / 120g (83% >= 70%)
      const input = {
        ...baseInput,
        activity: {
          loggedWaterMl: 2500,
          loggedProteinGrams: 100,
          mealCount: 3,
          hasWorkoutScheduledToday: true,
          hasQualifyingWorkoutToday: true,
        },
      };
      expect(evaluateDailyCheckIn(input)).toBeNull();
    });

    it("suppresses hydration reminder if user disabled hydration category", () => {
      const input = {
        ...baseInput,
        preferences: {
          ...baseInput.preferences,
          categories: { hydration: false, workout: true, nutrition: true },
        },
        activity: {
          ...baseInput.activity,
          loggedWaterMl: 500, // < 60%
          hasWorkoutScheduledToday: true,
          hasQualifyingWorkoutToday: false,
        },
      };
      const nudge = evaluateDailyCheckIn(input);
      // Since hydration is disabled, falls back to Priority 2 (Workout)
      expect(nudge?.type).toBe("workout_nudge");
    });
  });

  describe("Activity Achievements", () => {
    const baseAchievementInput = {
      userId: "user-456",
      localDate: "2026-10-27",
      targets: {
        dailyHydrationTarget: 2500,
        dailyProteinTarget: 120,
        weeklyWorkoutGoal: 3,
      },
      preferences: {
        achievementsEnabled: true,
        categories: { hydration: true, workout: true, nutrition: true },
      },
    };

    it("triggers hydration goal achievement when cumulative water crosses target", () => {
      const result = evaluateActivityAchievement({
        ...baseAchievementInput,
        eventType: "water",
        activity: {
          cumulativeWaterMl: 2600,
          cumulativeProteinGrams: 50,
          todayMealCount: 1,
          isQualifyingWorkout: false,
        },
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe("hydration_goal");
      expect(result?.title).toBe("Hydration Goal Reached!");
      expect(result?.dedupeKey).toBe("user-456:hydration_goal:2026-10-27");
    });

    it("triggers protein target achievement with consistent 3-meal message", () => {
      const result = evaluateActivityAchievement({
        ...baseAchievementInput,
        eventType: "meal",
        activity: {
          cumulativeWaterMl: 1000,
          cumulativeProteinGrams: 130,
          todayMealCount: 3,
          isQualifyingWorkout: false,
        },
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe("protein_goal");
      expect(result?.body).toBe("Nice consistency! You logged three meals today and reached your protein target.");
      expect(result?.dedupeKey).toBe("user-456:protein_goal:2026-10-27");
    });

    it("triggers workout progress achievement for qualifying workouts", () => {
      const result = evaluateActivityAchievement({
        ...baseAchievementInput,
        eventType: "workout",
        activity: {
          cumulativeWaterMl: 1000,
          cumulativeProteinGrams: 50,
          todayMealCount: 1,
          isQualifyingWorkout: true,
        },
      });

      expect(result).not.toBeNull();
      expect(result?.type).toBe("workout_progress");
      expect(result?.title).toBe("Workout Logged!");
      expect(result?.dedupeKey).toBe("user-456:workout_progress:2026-10-27");
    });

    it("returns null for non-qualifying workouts", () => {
      const result = evaluateActivityAchievement({
        ...baseAchievementInput,
        eventType: "workout",
        activity: {
          cumulativeWaterMl: 1000,
          cumulativeProteinGrams: 50,
          todayMealCount: 1,
          isQualifyingWorkout: false,
        },
      });

      expect(result).toBeNull();
    });
  });
});
