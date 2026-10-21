"use client";

import React from "react";
import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

interface DashboardHeaderProps {
  greeting: string;
  userName?: string;
  streak: number;
}

export function DashboardHeader({
  greeting,
  userName,
  streak,
}: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Athlete Greeting & Live Telemetry Badge */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
              </span>
              LIVE COCKPIT SYNC
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              BASELINE CALIBRATED
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {greeting},{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {userName || "Athlete"}
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Precision physiological telemetry, metabolic expenditures, and adaptive workout progressions.
          </p>
        </div>

        {/* Quick Toolbar & Streak HUD */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Streak Counter Pill */}
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 shadow-xs">
            <Flame className="size-4 text-amber-400 fill-amber-400 animate-pulse" />
            <div>
              <div className="text-xs font-bold font-mono text-amber-300">
                {streak} <span className="font-sans font-normal text-amber-200/80">DAY STREAK</span>
              </div>
              <div className="text-[10px] text-amber-400/70 font-medium">Progressive Overload</div>
            </div>
          </div>

          {/* AI Coach Action Button */}
          <Link
            href="/coach"
            className={cn(
              buttonVariants({ size: "sm" }),
              "relative group overflow-hidden bg-primary text-primary-foreground font-semibold text-xs h-10 px-4 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
            <Sparkles className="size-4 mr-1.5 text-emerald-200" />
            Ask AI Coach
          </Link>
        </div>
      </div>
    </div>
  );
}
