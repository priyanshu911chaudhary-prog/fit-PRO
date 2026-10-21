"use client";

import React from "react";
import { MacroBreakdown } from "../types";

interface MealMacroBarProps {
  macros: MacroBreakdown;
}

export function MealMacroBar({ macros }: MealMacroBarProps) {
  const { totalCalories, totalProtein, totalCarbs, totalFat, proteinPct, carbsPct, fatPct } =
    macros;

  if (totalCalories <= 0) return null;

  return (
    <div className="p-3.5 rounded-xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-md space-y-2">
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>Macronutrient Ratio Breakdown</span>
        <span className="text-foreground">100% Caloric Coverage</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden flex">
        <div
          style={{ width: `${proteinPct}%` }}
          className="bg-cyan-400 h-full transition-all duration-300"
          title={`Protein: ${proteinPct}%`}
        />
        <div
          style={{ width: `${carbsPct}%` }}
          className="bg-amber-400 h-full transition-all duration-300"
          title={`Carbs: ${carbsPct}%`}
        />
        <div
          style={{ width: `${fatPct}%` }}
          className="bg-purple-400 h-full transition-all duration-300"
          title={`Fats: ${fatPct}%`}
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
        <span className="flex items-center gap-1.5 text-cyan-400">
          <span className="size-2 rounded-full bg-cyan-400" />
          Protein: {proteinPct}% ({totalProtein}g)
        </span>
        <span className="flex items-center gap-1.5 text-amber-400">
          <span className="size-2 rounded-full bg-amber-400" />
          Carbs: {carbsPct}% ({totalCarbs}g)
        </span>
        <span className="flex items-center gap-1.5 text-purple-400">
          <span className="size-2 rounded-full bg-purple-400" />
          Fats: {fatPct}% ({totalFat}g)
        </span>
      </div>
    </div>
  );
}
