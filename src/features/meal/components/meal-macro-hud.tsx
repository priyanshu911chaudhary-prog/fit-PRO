"use client";

import React from "react";
import { Flame, Activity, Zap, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MacroBreakdown, DailyNutritionTarget } from "../types";

interface MealMacroHudProps {
  macros: MacroBreakdown;
  targets?: DailyNutritionTarget;
  isToday?: boolean;
}

export function MealMacroHud({ macros, targets, isToday = true }: MealMacroHudProps) {
  const {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    proteinCals,
    carbsCals,
    fatCals,
    proteinPct,
    carbsPct,
    fatPct,
  } = macros;

  const targetCals = targets?.targetCalories;
  const targetProtein = targets?.targetProtein;
  const targetCarbs = targets?.targetCarbs;
  const targetFat = targets?.targetFat;

  const calProgress = targetCals ? Math.min(100, Math.round((totalCalories / targetCals) * 100)) : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Energy */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-2 hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Flame className="size-3.5 text-emerald-400" />
            {isToday ? "Today's Energy" : "Daily Energy"}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
          >
            DAILY CONSUMED
          </Badge>
        </div>
        <div>
          <div className="text-2xl font-extrabold font-mono text-foreground flex items-baseline gap-1">
            {totalCalories}
            <span className="text-xs font-sans text-muted-foreground font-normal">kcal</span>
            {targetCals ? (
              <span className="text-xs font-mono text-muted-foreground/70 ml-1">
                / {targetCals}
              </span>
            ) : null}
          </div>
          {calProgress !== null ? (
            <div className="mt-1.5 h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all rounded-full"
                style={{ width: `${calProgress}%` }}
              />
            </div>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          {calProgress !== null ? `${calProgress}% of daily target` : "Aggregated from logged meals"}
        </p>
      </Card>

      {/* Protein */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-2 hover:border-cyan-500/30 transition-all">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-cyan-400" />
            Protein Consumed
          </span>
          <span className="text-[10px] font-mono text-cyan-400 font-bold">
            {proteinPct}% cals
          </span>
        </div>
        <div>
          <div className="text-2xl font-extrabold font-mono text-cyan-400 flex items-baseline gap-1">
            {totalProtein}
            <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
            {targetProtein ? (
              <span className="text-xs font-mono text-muted-foreground/70 ml-1">
                / {targetProtein}g
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          {proteinCals} kcal • Muscle repair & synthesis
        </p>
      </Card>

      {/* Carbs */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-2 hover:border-amber-500/30 transition-all">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-400" />
            Carbs Consumed
          </span>
          <span className="text-[10px] font-mono text-amber-400 font-bold">
            {carbsPct}% cals
          </span>
        </div>
        <div>
          <div className="text-2xl font-extrabold font-mono text-amber-400 flex items-baseline gap-1">
            {totalCarbs}
            <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
            {targetCarbs ? (
              <span className="text-xs font-mono text-muted-foreground/70 ml-1">
                / {targetCarbs}g
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          {carbsCals} kcal • Glycogen & daily stamina
        </p>
      </Card>

      {/* Fats */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-2 hover:border-purple-500/30 transition-all">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-purple-400" />
            Fats Consumed
          </span>
          <span className="text-[10px] font-mono text-purple-400 font-bold">
            {fatPct}% cals
          </span>
        </div>
        <div>
          <div className="text-2xl font-extrabold font-mono text-purple-400 flex items-baseline gap-1">
            {totalFat}
            <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
            {targetFat ? (
              <span className="text-xs font-mono text-muted-foreground/70 ml-1">
                / {targetFat}g
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground/80">
          {fatCals} kcal • Hormonal & cellular health
        </p>
      </Card>
    </div>
  );
}
