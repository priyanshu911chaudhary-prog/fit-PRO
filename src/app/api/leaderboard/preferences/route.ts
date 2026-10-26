import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { updateLeaderboardPreferencesSchema } from "@/validators/leaderboard.validator";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { User } from "@/models/user";
import { resolveUserTargets } from "@/lib/leaderboard/targets";
import { getCompetitionWeek, getNextCompetitionWeek } from "@/lib/leaderboard/calendar";
import { recalculateUserWeeklyScore } from "@/lib/leaderboard/recomputation";
import { removeRedisLeaderboardParticipant } from "@/lib/leaderboard/redis-ranking";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;
    const currentWeek = getCompetitionWeek().weekStart;

    const [settings, user, targets] = await Promise.all([
      LeaderboardSettings.findOne({ user: userId }),
      User.findById(userId).select("fullName"),
      resolveUserTargets(userId, currentWeek),
    ]);

    const data = {
      optIn: settings?.optIn ?? false,
      displayName: settings?.displayName || user?.fullName || "Athlete",
      weeklyWorkoutGoal: settings?.weeklyWorkoutGoal || targets.weeklyWorkoutGoal,
      dailyProteinTarget: settings?.dailyProteinTarget || targets.dailyProteinTarget,
      dailyHydrationTarget: settings?.dailyHydrationTarget || targets.dailyHydrationTarget,
      pendingWeeklyWorkoutGoal: settings?.pendingWeeklyWorkoutGoal,
      pendingDailyProteinTarget: settings?.pendingDailyProteinTarget,
      pendingDailyHydrationTarget: settings?.pendingDailyHydrationTarget,
      pendingGoalsEffectiveWeekStart: settings?.pendingGoalsEffectiveWeekStart,
    };

    return NextResponse.json(
      new ApiResponse(200, "Leaderboard preferences retrieved successfully", data),
      { status: 200 }
    );
  })
);

export const PATCH = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;
    const body = await validateBody(req, updateLeaderboardPreferencesSchema);
    const { weekStart } = getCompetitionWeek();
    const nextWeekStart = getNextCompetitionWeek(weekStart).weekStart;

    let settings = await LeaderboardSettings.findOne({ user: userId });
    const userDoc = await User.findById(userId).select("fullName");

    if (!settings) {
      const defaultTargets = await resolveUserTargets(userId, weekStart);
      settings = new LeaderboardSettings({
        user: userId,
        optIn: false,
        displayName: userDoc?.fullName || "Athlete",
        weeklyWorkoutGoal: defaultTargets.weeklyWorkoutGoal,
        dailyProteinTarget: defaultTargets.dailyProteinTarget,
        dailyHydrationTarget: defaultTargets.dailyHydrationTarget,
      });
    }

    if (body.displayName !== undefined) {
      settings.displayName = body.displayName.trim();
    }

    // Check if target changes were requested
    const hasTargetChanges =
      body.weeklyWorkoutGoal !== undefined ||
      body.dailyProteinTarget !== undefined ||
      body.dailyHydrationTarget !== undefined;

    let targetChangeMessage = "";

    if (hasTargetChanges) {
      // Check if user already has an active entry for the current week
      const currentEntry = await WeeklyLeaderboardEntry.findOne({
        user: userId,
        weekStart,
      });

      if (currentEntry) {
        // Active week in progress: target changes become effective on upcoming Monday boundary
        if (body.weeklyWorkoutGoal !== undefined) {
          settings.pendingWeeklyWorkoutGoal = body.weeklyWorkoutGoal;
        }
        if (body.dailyProteinTarget !== undefined) {
          settings.pendingDailyProteinTarget = body.dailyProteinTarget;
        }
        if (body.dailyHydrationTarget !== undefined) {
          settings.pendingDailyHydrationTarget = body.dailyHydrationTarget;
        }
        settings.pendingGoalsEffectiveWeekStart = nextWeekStart;
        targetChangeMessage = ` Target updates will take effect on Monday, ${nextWeekStart}.`;
      } else {
        // No current week entry yet: apply immediately
        if (body.weeklyWorkoutGoal !== undefined) {
          settings.weeklyWorkoutGoal = body.weeklyWorkoutGoal;
        }
        if (body.dailyProteinTarget !== undefined) {
          settings.dailyProteinTarget = body.dailyProteinTarget;
        }
        if (body.dailyHydrationTarget !== undefined) {
          settings.dailyHydrationTarget = body.dailyHydrationTarget;
        }
      }
    }

    // Handle opt-in toggle
    if (body.optIn !== undefined) {
      settings.optIn = body.optIn;

      if (!body.optIn) {
        // Immediate opt-out: remove from active Redis sorted set
        await removeRedisLeaderboardParticipant(weekStart, userId);

        // Update MongoDB current week record to ineligible
        await WeeklyLeaderboardEntry.findOneAndUpdate(
          { user: userId, weekStart },
          {
            $set: {
              isEligible: false,
              ineligibilityReason: "Not opted in to public leaderboard",
            },
          }
        ).catch(() => {});
      }
    }

    await settings.save();

    // Recompute current week score to apply changes
    if (settings.optIn) {
      await recalculateUserWeeklyScore(userId, weekStart).catch(() => {});
    }

    return NextResponse.json(
      new ApiResponse(
        200,
        `Leaderboard preferences updated successfully.${targetChangeMessage}`,
        {
          optIn: settings.optIn,
          displayName: settings.displayName,
          weeklyWorkoutGoal: settings.weeklyWorkoutGoal,
          dailyProteinTarget: settings.dailyProteinTarget,
          dailyHydrationTarget: settings.dailyHydrationTarget,
          pendingWeeklyWorkoutGoal: settings.pendingWeeklyWorkoutGoal,
          pendingDailyProteinTarget: settings.pendingDailyProteinTarget,
          pendingDailyHydrationTarget: settings.pendingDailyHydrationTarget,
          pendingGoalsEffectiveWeekStart: settings.pendingGoalsEffectiveWeekStart,
        }
      ),
      { status: 200 }
    );
  })
);
