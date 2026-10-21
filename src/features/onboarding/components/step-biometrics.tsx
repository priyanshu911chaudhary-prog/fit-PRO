"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GENDER_OPTIONS } from "../lib/constants";
import { cn } from "cn";

interface StepBiometricsProps {
  gender: string;
  setGender: (val: string) => void;
  dob: string;
  setDob: (val: string) => void;
  age: number;
  height: number;
  setHeight: (val: number) => void;
  weight: number;
  setWeight: (val: number) => void;
}

export function StepBiometrics({
  gender,
  setGender,
  dob,
  setDob,
  age,
  height,
  setHeight,
  weight,
  setWeight,
}: StepBiometricsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Calibrate Your Physical Baseline
        </h3>
        <p className="text-xs text-muted-foreground">
          Measurements directly drive your Mifflin-St Jeor metabolic calculation.
        </p>
      </div>

      <div className="space-y-4">
        {/* Gender Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Biological Sex</Label>
          <div className="grid grid-cols-3 gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGender(g.id)}
                className={cn(
                  "py-2.5 px-3 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer",
                  gender === g.id
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-xs"
                    : "border-border/70 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* DOB */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="dob" className="text-xs font-semibold">
              Date of Birth
            </Label>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {age} years old
            </span>
          </div>
          <Input
            id="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="bg-background/50 h-10 text-sm focus-visible:ring-emerald-500/30"
            required
          />
        </div>

        {/* Height Dual Slider + Stepper */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-baseline">
            <Label htmlFor="height" className="text-xs font-semibold">
              Height
            </Label>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-base font-black text-foreground">{height}</span>
              <span className="text-xs text-muted-foreground">cm</span>
            </div>
          </div>
          <input
            id="height"
            type="range"
            min={120}
            max={225}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-muted/60 rounded-lg"
          />
        </div>

        {/* Weight Dual Slider + Stepper */}
        <div className="space-y-2 pt-1">
          <div className="flex justify-between items-baseline">
            <Label htmlFor="weight" className="text-xs font-semibold">
              Weight
            </Label>
            <div className="flex items-center gap-1 font-mono">
              <span className="text-base font-black text-emerald-400">{weight}</span>
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
          </div>
          <input
            id="weight"
            type="range"
            min={40}
            max={180}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-2 bg-muted/60 rounded-lg"
          />
        </div>
      </div>
    </div>
  );
}
