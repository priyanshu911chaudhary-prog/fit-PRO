"use client";

import React from "react";
import { useLeaderboard } from "@/features/leaderboard/hooks/use-leaderboard";
import { LeaderboardHeader } from "./leaderboard-header";
import { LeaderboardPodium } from "./leaderboard-podium";
import { LeaderboardUserCard } from "./leaderboard-user-card";
import { LeaderboardTable } from "./leaderboard-table";
import { LeaderboardSettingsDialog } from "./leaderboard-settings-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Trophy, Shield, HelpCircle } from "lucide-react";

export function LeaderboardPageContent() {
  const {
    period,
    setPeriod,
    setPage,
    data,
    isLoading,
    error,
    preferences,
    isLoadingPrefs,
    isSavingPrefs,
    isSettingsOpen,
    setIsSettingsOpen,
    fetchLeaderboard,
    updatePreferences,
  } = useLeaderboard();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-300">
      {/* Header with period toggle & actions */}
      <LeaderboardHeader
        period={period}
        onPeriodChange={setPeriod}
        onOpenSettings={() => setIsSettingsOpen(true)}
        weekStart={data?.weekStart}
        weekEnd={data?.weekEnd}
        isFinalized={data?.isFinalized}
      />

      {/* Loading Skeleton */}
      {isLoading && !data && (
        <div className="space-y-6">
          <div className="h-44 rounded-2xl bg-card/60 border border-border/70 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-64 rounded-2xl bg-card/40 border border-border/50 animate-pulse" />
            <div className="h-72 rounded-2xl bg-card/60 border border-border/70 animate-pulse md:-translate-y-2" />
            <div className="h-64 rounded-2xl bg-card/40 border border-border/50 animate-pulse" />
          </div>
          <div className="h-96 rounded-2xl bg-card/60 border border-border/70 animate-pulse" />
        </div>
      )}

      {/* Error State */}
      {error && !data && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-destructive" />
            <h3 className="text-lg font-semibold text-destructive">Failed to Load Leaderboard</h3>
            <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeaderboard}
              className="mt-2 border-destructive/30 hover:bg-destructive/20"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {data && (
        <div className="space-y-8">
          {/* Authenticated User Rank & Personal Breakdown Card */}
          {data.currentUser && (
            <LeaderboardUserCard
              currentUser={data.currentUser}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {/* Podium for Top 3 */}
          <LeaderboardPodium
            podium={data.podium}
          />

          {/* Full Ranked Table */}
          <LeaderboardTable
            entries={data.entries}
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
            isLoading={isLoading}
          />

          {/* Rules & Eligibility Explanation Card */}
          <Card className="border-border/60 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  Scoring & Eligibility Rules
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-muted-foreground">
                <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Fit Score Formula</span>
                  </div>
                  <p className="leading-relaxed">
                    Score is 0–100, weighted by:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li><strong>40%</strong> Workout consistency</li>
                    <li><strong>30%</strong> Daily protein adherence</li>
                    <li><strong>30%</strong> Daily hydration adherence</li>
                  </ul>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">
                    Each component is capped at 100%. Missing logs earn 0 points.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Eligibility Requirements</span>
                  </div>
                  <p className="leading-relaxed">
                    A minimum of <strong>4 distinct tracked days</strong> during the week is required for public ranking.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Workouts qualify if completed with at least <strong>70% completion</strong> and <strong>15 minutes duration</strong>.
                  </p>
                </div>

                <div className="space-y-1.5 p-3 rounded-lg bg-background/50 border border-border/40">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                    <span>Fairness & Ties</span>
                  </div>
                  <p className="leading-relaxed">
                    Shared competition ranking (e.g. 1, 1, 3). Co-winners share the top podium.
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Target adjustments take effect the following Monday (00:00 IST) to prevent mid-week manipulation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Dialog */}
      <LeaderboardSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        preferences={preferences}
        isLoading={isLoadingPrefs}
        isSaving={isSavingPrefs}
        onSave={updatePreferences}
      />
    </div>
  );
}
