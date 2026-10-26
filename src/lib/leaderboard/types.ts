export interface LeaderboardTargets {
  weeklyWorkoutGoal: number; // e.g. 3
  dailyProteinTarget: number; // e.g. 120 (grams)
  dailyHydrationTarget: number; // e.g. 2500 (ml)
}

export interface DailyAdherenceRecord {
  date: string; // YYYY-MM-DD
  proteinG: number;
  waterMl: number;
  hasQualifyingWorkout: boolean;
  hasMealLog: boolean;
  hasWaterLog: boolean;
  isTrackedDay: boolean;
}

export interface ScoreBreakdown {
  qualifyingWorkoutsCount: number;
  weeklyWorkoutGoal: number;
  workoutAttainment: number; // 0.0 - 1.0 (min(qualifying / goal, 1.0))
  workoutComponentScore: number; // 0.0 - 40.0 (40% weight)

  dailyProteinValues: Record<string, number>;
  dailyProteinTarget: number;
  proteinAttainment: number; // 0.0 - 1.0 (average of daily min(protein / target, 1.0) over 7 days)
  proteinComponentScore: number; // 0.0 - 30.0 (30% weight)

  dailyWaterValues: Record<string, number>;
  dailyHydrationTarget: number;
  hydrationAttainment: number; // 0.0 - 1.0 (average of daily min(water / target, 1.0) over 7 days)
  hydrationComponentScore: number; // 0.0 - 30.0 (30% weight)

  trackedDaysCount: number; // 0 - 7
  isEligible: boolean; // trackedDaysCount >= 4
  ineligibilityReason?: string;

  weeklyFitScore: number; // 0.0 - 100.0 (sum of component scores)
  scoreBasisPoints: number; // 0 - 10,000 (deterministic integer for Redis ranking)
  displayScore: number; // human-readable rounded score (e.g. 85.50)
}

export interface LeaderboardParticipantRank {
  rank: number; // Standard competition rank: 1, 1, 3
  userId: string;
  displayName: string;
  displayScore: number;
  scoreBasisPoints: number;
  isEligible: boolean;
  isCurrentUser?: boolean;
}

export interface LeaderboardApiResponse {
  weekStart: string;
  weekEnd: string;
  period: "current" | "previous";
  isFinalized: boolean;
  entries: LeaderboardParticipantRank[];
  podium: LeaderboardParticipantRank[];
  previousWeekWinners?: LeaderboardParticipantRank[];
  currentUser?: {
    userId: string;
    rank: number | null;
    displayScore: number;
    scoreBasisPoints: number;
    isEligible: boolean;
    ineligibilityReason?: string;
    optIn: boolean;
    displayName: string;
    breakdown: ScoreBreakdown;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
