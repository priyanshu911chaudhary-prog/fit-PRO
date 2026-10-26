import { LeaderboardTargets, ScoreBreakdown } from "./types";
import { IWorkoutLog } from "@/models/workoutLog";

export const WORKOUT_WEIGHT = 0.40;
export const PROTEIN_WEIGHT = 0.30;
export const HYDRATION_WEIGHT = 0.30;

export const MIN_QUALIFYING_DURATION_MINS = 15;
export const MIN_QUALIFYING_COMPLETION_PCT = 70;
export const MIN_TRACKED_DAYS_FOR_ELIGIBILITY = 4;

/**
 * Validates whether an existing persisted workout log constitutes a qualifying session.
 */
export function isQualifyingWorkout(workout: Partial<IWorkoutLog>): boolean {
  if (!workout) return false;

  const duration = Number(workout.totalDuration ?? 0);
  const completion = Number(workout.completionPercentage ?? 100);
  const exerciseCount = Array.isArray(workout.exercises) ? workout.exercises.length : 0;

  return (
    duration >= MIN_QUALIFYING_DURATION_MINS &&
    completion >= MIN_QUALIFYING_COMPLETION_PCT &&
    exerciseCount >= 1
  );
}

export interface RawWeeklyActivityData {
  scoringDays: string[]; // 7 consecutive YYYY-MM-DD days
  qualifyingWorkoutsCount: number;
  dailyProtein: Record<string, number>; // dateStr -> grams
  dailyWater: Record<string, number>; // dateStr -> ml
  activeDays: Set<string>; // set of dateStr where any activity occurred
}

/**
 * Pure server-authoritative scoring engine.
 * Computes exact component attainments, weekly fit score, basis points, and 4-day eligibility.
 */
export function calculateWeeklyFitScore(
  activity: RawWeeklyActivityData,
  targets: LeaderboardTargets
): ScoreBreakdown {
  const { scoringDays, qualifyingWorkoutsCount, dailyProtein, dailyWater, activeDays } = activity;

  // 1. Workout Attainment (W): min(qualifying / goal, 1.0)
  const workoutGoal = Math.max(1, targets.weeklyWorkoutGoal);
  const workoutAttainment = Math.min(1.0, qualifyingWorkoutsCount / workoutGoal);
  const workoutComponentScore = workoutAttainment * WORKOUT_WEIGHT * 100; // 0 - 40 points

  // 2. Protein Adherence (P): 7-day average of min(dailyProtein / target, 1.0)
  const proteinTarget = Math.max(1, targets.dailyProteinTarget);
  let totalProteinDailyRatio = 0;
  for (const day of scoringDays) {
    const consumed = dailyProtein[day] || 0;
    const ratio = Math.min(1.0, Math.max(0, consumed / proteinTarget));
    totalProteinDailyRatio += ratio;
  }
  const proteinAttainment = totalProteinDailyRatio / 7.0; // 0.0 - 1.0
  const proteinComponentScore = proteinAttainment * PROTEIN_WEIGHT * 100; // 0 - 30 points

  // 3. Hydration Adherence (H): 7-day average of min(dailyWater / target, 1.0)
  const hydrationTarget = Math.max(1, targets.dailyHydrationTarget);
  let totalHydrationDailyRatio = 0;
  for (const day of scoringDays) {
    const consumed = dailyWater[day] || 0;
    const ratio = Math.min(1.0, Math.max(0, consumed / hydrationTarget));
    totalHydrationDailyRatio += ratio;
  }
  const hydrationAttainment = totalHydrationDailyRatio / 7.0; // 0.0 - 1.0
  const hydrationComponentScore = hydrationAttainment * HYDRATION_WEIGHT * 100; // 0 - 30 points

  // 4. Overall Weekly Fit Score (0.0 - 100.0)
  const weeklyFitScore = workoutComponentScore + proteinComponentScore + hydrationComponentScore;

  // Basis points: deterministic integer between 0 and 10,000 for exact Redis ranking and ties
  const scoreBasisPoints = Math.min(10000, Math.max(0, Math.round(weeklyFitScore * 100)));
  const displayScore = +(scoreBasisPoints / 100).toFixed(2);

  // 5. Eligibility Rule: minimum 4 distinct tracked days in the week
  const trackedDaysCount = activeDays.size;
  const isEligible = trackedDaysCount >= MIN_TRACKED_DAYS_FOR_ELIGIBILITY;
  const ineligibilityReason = isEligible
    ? undefined
    : `Requires activity on at least ${MIN_TRACKED_DAYS_FOR_ELIGIBILITY} distinct days this week (currently ${trackedDaysCount}/${MIN_TRACKED_DAYS_FOR_ELIGIBILITY})`;

  return {
    qualifyingWorkoutsCount,
    weeklyWorkoutGoal: workoutGoal,
    workoutAttainment: +workoutAttainment.toFixed(4),
    workoutComponentScore: +workoutComponentScore.toFixed(2),

    dailyProteinValues: dailyProtein,
    dailyProteinTarget: proteinTarget,
    proteinAttainment: +proteinAttainment.toFixed(4),
    proteinComponentScore: +proteinComponentScore.toFixed(2),

    dailyWaterValues: dailyWater,
    dailyHydrationTarget: hydrationTarget,
    hydrationAttainment: +hydrationAttainment.toFixed(4),
    hydrationComponentScore: +hydrationComponentScore.toFixed(2),

    trackedDaysCount,
    isEligible,
    ineligibilityReason,

    weeklyFitScore: +weeklyFitScore.toFixed(2),
    scoreBasisPoints,
    displayScore,
  };
}
