import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateQuery } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { leaderboardQuerySchema } from "@/validators/leaderboard.validator";
import { getCompetitionWeek, getPreviousCompetitionWeek } from "@/lib/leaderboard/calendar";
import { getLeaderboardRankings, getUserLeaderboardRank } from "@/lib/leaderboard/redis-ranking";
import {
  recalculateUserWeeklyScore,
  finalizeCompetitionWeek,
  processLeaderboardOutbox,
} from "@/lib/leaderboard/recomputation";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { User } from "@/models/user";
import { resolveUserTargets } from "@/lib/leaderboard/targets";
import { LeaderboardApiResponse, LeaderboardParticipantRank } from "@/lib/leaderboard/types";

export const GET = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const query = await validateQuery(req, leaderboardQuerySchema);
    const userId = sessionUser.userId;

    const currentWeek = getCompetitionWeek();
    const isPreviousPeriod = query.period === "previous";
    const selectedWeek = isPreviousPeriod
      ? getPreviousCompetitionWeek(currentWeek.weekStart)
      : currentWeek;

    const weekStart = selectedWeek.weekStart;
    const weekEnd = selectedWeek.weekEnd;

    // Opportunistic recovery drain (bounded to 3 jobs)
    processLeaderboardOutbox(3).catch(() => {});

    // If viewing previous week, ensure it is safely finalized
    if (isPreviousPeriod) {
      await finalizeCompetitionWeek(weekStart).catch(() => {});
    }

    // Offset calculation for pagination
    const offset = (query.page - 1) * query.limit;

    // Fetch ranked leaderboard participants
    const { entries: allEntries, total } = await getLeaderboardRankings(
      weekStart,
      query.limit,
      offset
    );

    // Identify current user's entry in the page list
    const enrichedEntries: LeaderboardParticipantRank[] = allEntries.map((entry) => ({
      ...entry,
      isCurrentUser: entry.userId === userId,
    }));

    // Derive podium (top positions with ranks <= 3, accommodating ties)
    let podium: LeaderboardParticipantRank[] = [];
    if (query.page === 1) {
      podium = enrichedEntries.filter((e) => e.rank <= 3);
    } else {
      // If beyond page 1, fetch top 3 for podium display
      const top3Data = await getLeaderboardRankings(weekStart, 10, 0);
      podium = top3Data.entries.filter((e) => e.rank <= 3);
    }

    // Ensure authenticated user has an entry computed for current week
    let userEntryDoc = await WeeklyLeaderboardEntry.findOne({
      user: userId,
      weekStart,
    });

    if (!userEntryDoc && !isPreviousPeriod) {
      // Trigger lazy compute for the user
      await recalculateUserWeeklyScore(userId, weekStart);
      userEntryDoc = await WeeklyLeaderboardEntry.findOne({
        user: userId,
        weekStart,
      });
    }

    // Fetch user settings and rank
    const [userSettings, userRankData] = await Promise.all([
      LeaderboardSettings.findOne({ user: userId }),
      getUserLeaderboardRank(weekStart, userId),
    ]);

    let currentUserData: LeaderboardApiResponse["currentUser"] = undefined;

    if (userEntryDoc) {
      currentUserData = {
        userId,
        rank: userRankData.rank,
        displayScore: userEntryDoc.displayScore,
        scoreBasisPoints: userEntryDoc.scoreBasisPoints,
        isEligible: userEntryDoc.isEligible,
        ineligibilityReason: userEntryDoc.ineligibilityReason,
        optIn: userSettings?.optIn ?? false,
        displayName: userEntryDoc.displayNameSnapshot,
        breakdown: {
          qualifyingWorkoutsCount: userEntryDoc.qualifyingWorkoutsCount,
          weeklyWorkoutGoal: userEntryDoc.targetSnapshot.weeklyWorkoutGoal,
          workoutAttainment: userEntryDoc.workoutComponent,
          workoutComponentScore: +(userEntryDoc.workoutComponent * 40).toFixed(2),

          dailyProteinValues: {},
          dailyProteinTarget: userEntryDoc.targetSnapshot.dailyProteinTarget,
          proteinAttainment: userEntryDoc.proteinComponent,
          proteinComponentScore: +(userEntryDoc.proteinComponent * 30).toFixed(2),

          dailyWaterValues: {},
          dailyHydrationTarget: userEntryDoc.targetSnapshot.dailyHydrationTarget,
          hydrationAttainment: userEntryDoc.hydrationComponent,
          hydrationComponentScore: +(userEntryDoc.hydrationComponent * 30).toFixed(2),

          trackedDaysCount: userEntryDoc.trackedDaysCount,
          isEligible: userEntryDoc.isEligible,
          ineligibilityReason: userEntryDoc.ineligibilityReason,

          weeklyFitScore: userEntryDoc.displayScore,
          scoreBasisPoints: userEntryDoc.scoreBasisPoints,
          displayScore: userEntryDoc.displayScore,
        },
      };
    } else {
      // User has zero logs this week
      const defaultTargets = await resolveUserTargets(userId, weekStart);
      const userDoc = await User.findById(userId).select("fullName");
      currentUserData = {
        userId,
        rank: null,
        displayScore: 0,
        scoreBasisPoints: 0,
        isEligible: false,
        ineligibilityReason: !userSettings?.optIn
          ? "Not opted in to public leaderboard"
          : "Requires activity on at least 4 distinct days this week (currently 0/4)",
        optIn: userSettings?.optIn ?? false,
        displayName: userSettings?.displayName || userDoc?.fullName || "Athlete",
        breakdown: {
          qualifyingWorkoutsCount: 0,
          weeklyWorkoutGoal: defaultTargets.weeklyWorkoutGoal,
          workoutAttainment: 0,
          workoutComponentScore: 0,

          dailyProteinValues: {},
          dailyProteinTarget: defaultTargets.dailyProteinTarget,
          proteinAttainment: 0,
          proteinComponentScore: 0,

          dailyWaterValues: {},
          dailyHydrationTarget: defaultTargets.dailyHydrationTarget,
          hydrationAttainment: 0,
          hydrationComponentScore: 0,

          trackedDaysCount: 0,
          isEligible: false,
          ineligibilityReason: "Requires activity on at least 4 distinct days this week (currently 0/4)",

          weeklyFitScore: 0,
          scoreBasisPoints: 0,
          displayScore: 0,
        },
      };
    }

    // Query previous week's winner(s) if viewing current week
    let previousWeekWinners: LeaderboardParticipantRank[] = [];
    if (!isPreviousPeriod) {
      const prevWeek = getPreviousCompetitionWeek(currentWeek.weekStart);
      const prevWeekData = await getLeaderboardRankings(prevWeek.weekStart, 5, 0);
      previousWeekWinners = prevWeekData.entries.filter((e) => e.rank === 1);
    }

    const totalPages = Math.ceil(total / query.limit) || 1;

    const responsePayload: LeaderboardApiResponse = {
      weekStart,
      weekEnd,
      period: query.period,
      isFinalized: userEntryDoc?.isFinalized ?? isPreviousPeriod,
      entries: enrichedEntries,
      podium,
      previousWeekWinners,
      currentUser: currentUserData,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages,
      },
    };

    return NextResponse.json(
      new ApiResponse(200, "Leaderboard retrieved successfully", responsePayload),
      { status: 200 }
    );
  })
);
