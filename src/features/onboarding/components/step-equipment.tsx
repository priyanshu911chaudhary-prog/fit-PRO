"use client";

import React from "react";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { EquipmentEnum, UserDietaryPreferenceEnum } from "@/constants";
import { EXPERIENCE_OPTIONS } from "../lib/constants";
import { cn } from "cn";

interface StepEquipmentProps {
  experienceLevel: string;
  setExperienceLevel: (val: string) => void;
  equipmentAvailable: string[];
  toggleEquipment: (eq: string) => void;
  dietaryPreference: string;
  setDietaryPreference: (val: string) => void;
}

export function StepEquipment({
  experienceLevel,
  setExperienceLevel,
  equipmentAvailable,
  toggleEquipment,
  dietaryPreference,
  setDietaryPreference,
}: StepEquipmentProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Available Gear & Dietary Preferences
        </h3>
        <p className="text-xs text-muted-foreground">
          Ensures every generated exercise matches what you actually have access to.
        </p>
      </div>

      {/* Experience Level */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Lifting Experience</Label>
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE_OPTIONS.map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => setExperienceLevel(exp.id)}
              className={cn(
                "py-2.5 px-2 rounded-xl text-center border transition-all cursor-pointer",
                experienceLevel === exp.id
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-xs"
                  : "border-border/70 bg-background/50 hover:bg-muted/70 text-muted-foreground"
              )}
            >
              <p className="text-xs font-bold">{exp.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{exp.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Available Gear (Multi-select) */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label className="text-xs font-semibold">Available Equipment (Multi-Select)</Label>
          <span className="text-[11px] text-emerald-400 font-mono">
            {equipmentAvailable.length} selected
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.values(EquipmentEnum) as string[]).map((eq) => {
            const isSelected = equipmentAvailable.includes(eq);
            return (
              <button
                key={eq}
                type="button"
                onClick={() => toggleEquipment(eq)}
                className={cn(
                  "p-2.5 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer flex items-center justify-between",
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-bold"
                    : "border-border/60 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                )}
              >
                <span className="truncate">{eq.replace(/_/g, " ")}</span>
                {isSelected && <Check className="size-3.5 text-emerald-400 shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dietary Preference */}
      <div className="space-y-1.5 pt-1">
        <Label className="text-xs font-semibold">Dietary Protocol</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.values(UserDietaryPreferenceEnum) as string[]).map((diet) => (
            <button
              key={diet}
              type="button"
              onClick={() => setDietaryPreference(diet)}
              className={cn(
                "py-2 px-2.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer",
                dietaryPreference === diet
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-border/60 bg-background/50 hover:bg-muted/70 text-muted-foreground"
              )}
            >
              {diet.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
