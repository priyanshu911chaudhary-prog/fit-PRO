import mongoose from "mongoose";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { Profile } from "@/models/profile";
import { LeaderboardTargets } from "./types";
import { getCompetitionWeek } from "./calendar";

export const DEFAULT_HYDRATION_TARGET_ML = 2500;
export const DEFAULT_WORKOUT_GOAL = 3;
export const DEFAULT_PROTEIN_TARGET_G = 120;

/**
 * Resolves the authoritative weekly fitness targets for a given participant.
 * If target changes were scheduled, only applies them if the week being scored
 * is at or after the scheduled effective week boundary.
 */
export async function resolveUserTargets(
  userId: string | mongoose.Types.ObjectId,
  targetWeekStart?: string
): Promise<LeaderboardTargets> {
  const currentWeek = targetWeekStart || getCompetitionWeek().weekStart;

  const settings = await LeaderboardSettings.findOne({ user: userId });

  if (settings) {
    let weeklyWorkoutGoal = settings.weeklyWorkoutGoal || DEFAULT_WORKOUT_GOAL;
    let dailyProteinTarget = settings.dailyProteinTarget || DEFAULT_PROTEIN_TARGET_G;
    let dailyHydrationTarget = settings.dailyHydrationTarget || DEFAULT_HYDRATION_TARGET_ML;

    // Check if pending target updates have reached their effective week
    if (
      settings.pendingGoalsEffectiveWeekStart &&
      currentWeek >= settings.pendingGoalsEffectiveWeekStart
    ) {
      let needsSave = false;
      if (settings.pendingWeeklyWorkoutGoal !== undefined) {
        weeklyWorkoutGoal = settings.pendingWeeklyWorkoutGoal;
        settings.weeklyWorkoutGoal = settings.pendingWeeklyWorkoutGoal;
        settings.pendingWeeklyWorkoutGoal = undefined;
        needsSave = true;
      }
      if (settings.pendingDailyProteinTarget !== undefined) {
        dailyProteinTarget = settings.pendingDailyProteinTarget;
        settings.dailyProteinTarget = settings.pendingDailyProteinTarget;
        settings.pendingDailyProteinTarget = undefined;
        needsSave = true;
      }
      if (settings.pendingDailyHydrationTarget !== undefined) {
        dailyHydrationTarget = settings.pendingDailyHydrationTarget;
        settings.dailyHydrationTarget = settings.pendingDailyHydrationTarget;
        settings.pendingDailyHydrationTarget = undefined;
        needsSave = true;
      }
      if (needsSave) {
        settings.pendingGoalsEffectiveWeekStart = undefined;
        await settings.save().catch(() => {});
      }
    }

    return {
      weeklyWorkoutGoal,
      dailyProteinTarget,
      dailyHydrationTarget,
    };
  }

  // Derive initial protein goal from profile if available (1.6g per kg of bodyweight)
  let derivedProtein = DEFAULT_PROTEIN_TARGET_G;
  try {
    const profile = await Profile.findOne({ user: userId }).select("weight");
    if (profile?.weight && profile.weight > 0) {
      derivedProtein = Math.max(50, Math.min(300, Math.round(profile.weight * 1.6)));
    }
  } catch {
    // safe fallback
  }

  return {
    weeklyWorkoutGoal: DEFAULT_WORKOUT_GOAL,
    dailyProteinTarget: derivedProtein,
    dailyHydrationTarget: DEFAULT_HYDRATION_TARGET_ML,
  };
}
