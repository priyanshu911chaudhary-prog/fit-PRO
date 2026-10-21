"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface StepCalibrationProps {
  age: number;
  gender: string;
  height: number;
  weight: number;
  fitnessGoal: string;
  activityLevel: string;
  dietaryPreference: string;
  equipmentAvailable: string[];
  tdee: number;
}

export function StepCalibration({
  age,
  gender,
  height,
  weight,
  fitnessGoal,
  activityLevel,
  dietaryPreference,
  equipmentAvailable,
  tdee,
}: StepCalibrationProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Calibration Dossier
        </h3>
        <p className="text-xs text-muted-foreground">
          Review your biometric metrics before initializing your 3-day split program.
        </p>
      </div>

      {/* Athlete Dossier Grid */}
      <div className="rounded-2xl border border-border/80 bg-background/60 p-4 space-y-3 text-xs">
        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <span className="text-muted-foreground">Athlete Baseline:</span>
          <span className="font-bold text-foreground capitalize">
            {age} yrs • {gender} • {height} cm • {weight} kg
          </span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <span className="text-muted-foreground">Target Objective:</span>
          <span className="font-bold text-emerald-400 capitalize">
            {fitnessGoal.replace(/_/g, " ")}
          </span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <span className="text-muted-foreground">Daily Movement:</span>
          <span className="font-bold text-foreground capitalize">
            {activityLevel.replace(/_/g, " ")}
          </span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <span className="text-muted-foreground">Nutrition Preference:</span>
          <span className="font-bold text-cyan-400 capitalize">
            {dietaryPreference.replace(/_/g, " ")}
          </span>
        </div>

        <div className="flex justify-between items-start">
          <span className="text-muted-foreground">Gear Catalog:</span>
          <span className="font-bold text-foreground capitalize text-right max-w-[240px]">
            {equipmentAvailable.join(", ").replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Macro Target Projection Banner */}
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 text-xs text-emerald-400">
        <Sparkles className="size-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-foreground">Automatic Day-1 Seeding Enabled</span>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Launching will initialize your 3-day workout split, set your daily {tdee} kcal target, and
            calibrate your progressive overload tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
