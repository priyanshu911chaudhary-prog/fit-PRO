"use client";

import React from "react";
import { Dumbbell, Utensils, Droplet, CheckCircle2, AlertCircle, EyeOff, Sparkles, TrendingUp } from "lucide-react";
import { LeaderboardApiResponse } from "@/lib/leaderboard/types";
import { Button } from "@/components/ui/button";

interface LeaderboardUserCardProps {
  currentUser?: LeaderboardApiResponse["currentUser"];
  onOpenSettings: () => void;
}

export function LeaderboardUserCard({ currentUser, onOpenSettings }: LeaderboardUserCardProps) {
  if (!currentUser) return null;

  const { rank, displayScore, isEligible, ineligibilityReason, optIn, displayName, breakdown } =
    currentUser;

  const trackedDays = breakdown.trackedDaysCount;
  const isEligibleForRanking = isEligible && optIn;

  return (
    <div className="p-6 rounded-2xl bg-card/80 border border-primary/20 backdrop-blur-xl shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: User Identity & Ranking Position */}
        <div className="flex items-start gap-4">
          <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center text-primary font-mono shadow-inner shrink-0">
            {rank !== null ? (
              <>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Rank</span>
                <span className="text-2xl font-extrabold text-foreground">#{rank}</span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Rank</span>
                <span className="text-sm font-bold text-muted-foreground">—</span>
              </>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground">
                Your Weekly Standing
              </span>
              {optIn ? (
                isEligible ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="size-3" /> Officially Ranked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertCircle className="size-3" /> Incomplete Days ({trackedDays}/4)
                  </span>
                )
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border">
                  <EyeOff className="size-3" /> Private Mode
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              {displayName}
            </h2>

            {/* Eligibility Progress Meter (Minimum 4 tracked days rule) */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground font-mono">Tracked Days:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => (
                  <div
                    key={dayNum}
                    className={`size-3 rounded-full border transition-all ${
                      dayNum <= trackedDays
                        ? "bg-primary border-primary shadow-sm"
                        : "bg-muted/40 border-border/60"
                    }`}
                    title={`Day ${dayNum} ${dayNum <= trackedDays ? "Active" : "Pending"}`}
                  />
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground font-mono ml-1">
                ({trackedDays}/4 min required)
              </span>
            </div>
          </div>
        </div>

        {/* Center: Weekly Fit Score */}
        <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-muted/40 border border-border/60">
          <div>
            <div className="text-[11px] uppercase font-mono tracking-wider text-muted-foreground">
              Weekly Fit Score
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-3xl font-extrabold font-mono text-primary">
                {displayScore.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/ 100</span>
            </div>
          </div>

          {!optIn && (
            <Button size="sm" onClick={onOpenSettings} className="gap-1.5 text-xs">
              <Sparkles className="size-3.5" />
              Join Public Ranking
            </Button>
          )}
        </div>
      </div>

      {/* Ineligibility or Opt-Out Explanatory Banner */}
      {!isEligibleForRanking && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-amber-400" />
            <span>
              {!optIn
                ? "You are currently in Private Mode. Enable public rankings in Settings to showcase your score."
                : ineligibilityReason || "Log activities on at least 4 distinct days this week to qualify for public ranking."}
            </span>
          </div>
          {!optIn && (
            <button
              onClick={onOpenSettings}
              className="text-xs font-semibold text-amber-400 underline underline-offset-4 hover:text-amber-300 text-left"
            >
              Configure Opt-In
            </button>
          )}
        </div>
      )}

      {/* Private 3-Component Score Breakdown */}
      <div className="mt-6 pt-6 border-t border-border/70 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground font-semibold flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-primary" />
            Your Private Component Breakdown
          </span>
          <span className="text-[11px] text-muted-foreground font-mono">
            Weights: Workouts (40%) + Protein (30%) + Hydration (30%)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Component 1: Workouts (40%) */}
          <div className="p-3.5 rounded-xl bg-background/50 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Dumbbell className="size-3.5 text-blue-400" />
                Workouts (40%)
              </span>
              <span className="font-mono font-bold text-foreground">
                {breakdown.workoutComponentScore.toFixed(1)} / 40 pts
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round(breakdown.workoutAttainment * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>{breakdown.qualifyingWorkoutsCount} qualifying logged</span>
              <span>Goal: {breakdown.weeklyWorkoutGoal} sessions</span>
            </div>
          </div>

          {/* Component 2: Protein (30%) */}
          <div className="p-3.5 rounded-xl bg-background/50 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Utensils className="size-3.5 text-emerald-400" />
                Protein Adherence (30%)
              </span>
              <span className="font-mono font-bold text-foreground">
                {breakdown.proteinComponentScore.toFixed(1)} / 30 pts
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round(breakdown.proteinAttainment * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>7-day adherence: {Math.round(breakdown.proteinAttainment * 100)}%</span>
              <span>Daily Target: {breakdown.dailyProteinTarget}g</span>
            </div>
          </div>

          {/* Component 3: Hydration (30%) */}
          <div className="p-3.5 rounded-xl bg-background/50 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Droplet className="size-3.5 text-cyan-400" />
                Hydration Adherence (30%)
              </span>
              <span className="font-mono font-bold text-foreground">
                {breakdown.hydrationComponentScore.toFixed(1)} / 30 pts
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round(breakdown.hydrationAttainment * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>7-day adherence: {Math.round(breakdown.hydrationAttainment * 100)}%</span>
              <span>Daily Target: {breakdown.dailyHydrationTarget} ml</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
