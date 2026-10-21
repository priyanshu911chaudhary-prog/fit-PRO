"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { GOAL_OPTIONS, ACTIVITY_OPTIONS } from "../lib/constants";
import { cn } from "cn";

interface StepGoalsProps {
  fitnessGoal: string;
  setFitnessGoal: (val: string) => void;
  activityLevel: string;
  setActivityLevel: (val: string) => void;
}

export function StepGoals({
  fitnessGoal,
  setFitnessGoal,
  activityLevel,
  setActivityLevel,
}: StepGoalsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Target Goal & Movement Frequency
        </h3>
        <p className="text-xs text-muted-foreground">
          Determines your workout routine split and daily macronutrient partition.
        </p>
      </div>

      {/* Primary Goal Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Primary Athletic Objective</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {GOAL_OPTIONS.map((g) => {
            const isSelected = fitnessGoal === g.id;
            const Icon = g.icon;
            return (
              <div
                key={g.id}
                onClick={() => setFitnessGoal(g.id)}
                className={cn(
                  "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/15 shadow-xs"
                    : "border-border/70 bg-background/50 hover:bg-muted/60"
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "bg-emerald-500 text-black shadow-xs"
                      : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">{g.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{g.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Activity Level */}
      <div className="space-y-2 pt-2">
        <Label className="text-xs font-semibold">Daily Movement Level</Label>
        <div className="space-y-1.5">
          {ACTIVITY_OPTIONS.map((lvl) => {
            const isSelected = activityLevel === lvl.id;
            return (
              <div
                key={lvl.id}
                onClick={() => setActivityLevel(lvl.id)}
                className={cn(
                  "flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all cursor-pointer select-none",
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/15 text-foreground"
                    : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "size-4 rounded-full border flex items-center justify-center",
                      isSelected
                        ? "border-emerald-400 bg-emerald-400"
                        : "border-border/80"
                    )}
                  >
                    {isSelected && <span className="size-1.5 rounded-full bg-black" />}
                  </div>
                  <span className="text-xs font-bold text-foreground">{lvl.label}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{lvl.detail}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
