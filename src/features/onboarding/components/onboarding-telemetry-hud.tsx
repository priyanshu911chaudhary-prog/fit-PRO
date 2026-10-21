"use client";

import React from "react";
import { Scale, Flame, Activity } from "lucide-react";

interface OnboardingTelemetryHudProps {
  bmiInfo: { bmi: number; category: string };
  bmr: number;
  tdee: number;
}

export function OnboardingTelemetryHud({
  bmiInfo,
  bmr,
  tdee,
}: OnboardingTelemetryHudProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-background/70 backdrop-blur-md p-4 grid grid-cols-3 gap-3 text-center shadow-xs">
      <div className="space-y-0.5">
        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Scale className="size-3 text-emerald-400" />
          <span>BMI Score</span>
        </div>
        <div className="text-xl font-black text-emerald-400">{bmiInfo.bmi}</div>
        <span className="inline-block text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 capitalize">
          {bmiInfo.category}
        </span>
      </div>

      <div className="space-y-0.5 border-x border-border/50 px-2">
        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Flame className="size-3 text-amber-400" />
          <span>Resting BMR</span>
        </div>
        <div className="text-xl font-black text-foreground">{bmr}</div>
        <span className="text-[10px] text-muted-foreground">kcal / day (Basal)</span>
      </div>

      <div className="space-y-0.5">
        <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
          <Activity className="size-3 text-cyan-400" />
          <span>Projected TDEE</span>
        </div>
        <div className="text-xl font-black text-cyan-400">{tdee}</div>
        <span className="text-[10px] text-muted-foreground">kcal / day (Burn)</span>
      </div>
    </div>
  );
}
