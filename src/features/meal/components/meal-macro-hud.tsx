"use client";

import React from "react";
import { Flame, Activity, Zap, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MacroBreakdown } from "../types";

interface MealMacroHudProps {
  macros: MacroBreakdown;
}

export function MealMacroHud({ macros }: MealMacroHudProps) {
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Energy */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Flame className="size-3.5 text-emerald-400" />
            Total Energy
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-emerald-500/30 text-emerald-400"
          >
            PLATE
          </Badge>
        </div>
        <div className="text-2xl font-extrabold font-mono text-foreground">
          {totalCalories} <span className="text-xs font-sans text-muted-foreground font-normal">kcal</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">Metabolic fuel sum</p>
      </Card>

      {/* Protein */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-cyan-400" />
            Protein
          </span>
          <span className="text-[10px] font-mono text-cyan-400">{proteinPct}%</span>
        </div>
        <div className="text-2xl font-extrabold font-mono text-cyan-400">
          {totalProtein} <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">{proteinCals} kcal • Muscle synthesis</p>
      </Card>

      {/* Carbs */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-400" />
            Carbohydrates
          </span>
          <span className="text-[10px] font-mono text-amber-400">{carbsPct}%</span>
        </div>
        <div className="text-2xl font-extrabold font-mono text-amber-400">
          {totalCarbs} <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">{carbsCals} kcal • Glycogen replenish</p>
      </Card>

      {/* Fats */}
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-purple-400" />
            Lipids & Fats
          </span>
          <span className="text-[10px] font-mono text-purple-400">{fatPct}%</span>
        </div>
        <div className="text-2xl font-extrabold font-mono text-purple-400">
          {totalFat} <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">{fatCals} kcal • Hormonal baseline</p>
      </Card>
    </div>
  );
}
