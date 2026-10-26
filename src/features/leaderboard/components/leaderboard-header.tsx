"use client";

import React from "react";
import { Trophy, Settings, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaderboardHeaderProps {
  period: "current" | "previous";
  onPeriodChange: (p: "current" | "previous") => void;
  weekStart?: string;
  weekEnd?: string;
  isFinalized?: boolean;
  onOpenSettings: () => void;
}

export function LeaderboardHeader({
  period,
  onPeriodChange,
  weekStart,
  weekEnd,
  isFinalized,
  onOpenSettings,
}: LeaderboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/80 shadow-2xl">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Trophy className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Global Fitness Arena
              {isFinalized ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="size-3" /> Finalized
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" /> Live Competition
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
              <Calendar className="size-3 text-muted-foreground/70" />
              Week: {weekStart || "..."} – {weekEnd || "..."} (Asia/Kolkata IST)
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Period Selector Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60">
          <button
            type="button"
            onClick={() => onPeriodChange("current")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              period === "current"
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange("previous")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              period === "previous"
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last Week
          </button>
        </div>

        {/* Participation & Goals Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          className="gap-2 border-border/80 hover:bg-muted/80 text-xs font-medium"
        >
          <Settings className="size-3.5" />
          Settings & Goals
        </Button>
      </div>
    </div>
  );
}
