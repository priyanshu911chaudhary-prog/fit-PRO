import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanType } from "../types";

interface PlansHeaderProps {
  planType: PlanType;
  isGeneratingWorkout: boolean;
  isGeneratingMeal: boolean;
  onGenerateWorkout: () => void;
  onGenerateMeal: () => void;
}

export function PlansHeader({
  planType,
  isGeneratingWorkout,
  isGeneratingMeal,
  onGenerateWorkout,
  onGenerateMeal,
}: PlansHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Sparkles className="size-3.5" />
              ADAPTIVE PROTOCOL GENERATOR
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              GEMINI HIGH-PRECISION
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Algorithmic Training & Nutrition Splits
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Personalized multi-day periodization splits and macro-balanced dietary fuel regimens.
          </p>
        </div>

        {/* Action Trigger */}
        {planType === "workout" ? (
          <Button
            id="generate-workout-plan-btn"
            onClick={onGenerateWorkout}
            disabled={isGeneratingWorkout}
            className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer transition-all self-start md:self-auto"
          >
            {isGeneratingWorkout ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Synthesizing Overload Split...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2 text-emerald-200" />
                Formulate New Workout Split
              </>
            )}
          </Button>
        ) : (
          <Button
            id="generate-meal-plan-btn"
            onClick={onGenerateMeal}
            disabled={isGeneratingMeal}
            className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer transition-all self-start md:self-auto"
          >
            {isGeneratingMeal ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Calculating Macro Partition...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2 text-emerald-200" />
                Formulate New Nutrition Plan
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
