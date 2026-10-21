"use client";

import React from "react";
import { Utensils, Plus, History } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";

interface MealHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  historyCount: number;
}

export function MealHeader({
  activeTab,
  onTabChange,
  historyCount,
}: MealHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Utensils className="size-3.5" />
              NUTRITIONAL TELEMETRY
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              MACRO RATIOS ACTIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Nutrition & Macronutrient Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Precision macronutrient tracking, real-time energy calculation, and dietary fuel logging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TabsList className="bg-background/60 border border-border/70 p-1 rounded-xl">
            <TabsTrigger
              value="log"
              onClick={() => onTabChange("log")}
              className={cn(
                "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                activeTab === "log"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Plus className="size-3.5" />
              Log Meal
            </TabsTrigger>
            <TabsTrigger
              value="history"
              onClick={() => onTabChange("history")}
              className={cn(
                "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                activeTab === "history"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="size-3.5" />
              History ({historyCount})
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
    </div>
  );
}
