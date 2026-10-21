"use client";

import React from "react";
import {
  Sliders,
  User as UserIcon,
  Calendar,
  ShieldCheck,
  Activity,
  Loader2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserDietaryPreferenceEnum,
  EquipmentEnum,
  ExperienceLevelEnum,
} from "@/constants";
import { GOAL_ICONS } from "../lib/constants";
import { formatDob } from "../lib/formatters";
import { ProfileData, ProfileMetrics } from "../types";
import { cn } from "cn";

interface ProfileBiometricsFormProps {
  profile: ProfileData | null;
  metrics: ProfileMetrics | null;
  height: number;
  setHeight: (val: number) => void;
  weight: number;
  setWeight: (val: number) => void;
  fitnessGoal: string;
  setFitnessGoal: (val: string) => void;
  activityLevel: string;
  setActivityLevel: (val: string) => void;
  experienceLevel: string;
  setExperienceLevel: (val: string) => void;
  dietaryPreference: string;
  setDietaryPreference: (val: string) => void;
  equipmentAvailable: string[];
  toggleEquipment: (eq: string) => void;
  isSaving: boolean;
  onSave: (e: React.FormEvent) => void;
}

export function ProfileBiometricsForm({
  profile,
  metrics,
  height,
  setHeight,
  weight,
  setWeight,
  fitnessGoal,
  setFitnessGoal,
  activityLevel,
  setActivityLevel,
  experienceLevel,
  setExperienceLevel,
  dietaryPreference,
  setDietaryPreference,
  equipmentAvailable,
  toggleEquipment,
  isSaving,
  onSave,
}: ProfileBiometricsFormProps) {
  return (
    <form onSubmit={onSave}>
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-xl">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Sliders className="size-4 text-emerald-400" />
            Biometrics & Calibration Parameters
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Adjusting your biometric specifications dynamically re-computes your metabolic expenditure
            baselines.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {/* Non-editable bio-passport card */}
          {profile && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-card/40 border border-border/60 text-xs font-mono">
              <div>
                <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                  <UserIcon className="size-3.5 text-emerald-400" /> Biological Sex
                </span>
                <span className="font-bold text-foreground capitalize">{profile.gender}</span>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                  <Calendar className="size-3.5 text-cyan-400" /> Date of Birth
                </span>
                <span className="font-bold text-foreground">{formatDob(profile.dob)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1 text-[11px]">Calibrated Age</span>
                <span className="font-bold text-foreground">
                  {profile.age || metrics?.age || "—"} years
                </span>
              </div>
              <div>
                <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                  <ShieldCheck className="size-3.5 text-emerald-400" /> Bio-Passport Status
                </span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Verified
                </span>
              </div>
            </div>
          )}

          {/* Editable Height & Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="height" className="text-xs font-medium text-muted-foreground">
                Height (cm)
              </Label>
              <Input
                id="height"
                type="number"
                min={50}
                max={250}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="bg-background/50 border-border/70 text-foreground font-mono text-sm h-10"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="weight" className="text-xs font-medium text-muted-foreground">
                Body Weight (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                min={20}
                max={300}
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="bg-background/50 border-border/70 text-foreground font-mono text-sm h-10"
                required
              />
            </div>
          </div>

          {/* Fitness Goal */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Primary Fitness Protocol
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.values(UserGoalEnum) as string[]).map((goal) => {
                const isSelected = fitnessGoal === goal;
                const IconComp = GOAL_ICONS[goal] || Activity;

                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setFitnessGoal(goal)}
                    className={cn(
                      "p-3 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer flex flex-col justify-between space-y-2",
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                        : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <IconComp
                      className={cn(
                        "size-4",
                        isSelected ? "text-emerald-400" : "text-muted-foreground"
                      )}
                    />
                    <span className="leading-tight">{goal.replace(/_/g, " ")}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Level */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Activity & Exertion Level
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.values(UserActivityLevelEnum) as string[]).map((lvl) => {
                const isSelected = activityLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActivityLevel(lvl)}
                    className={cn(
                      "p-3 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer",
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                        : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <span className="block font-semibold">{lvl.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {lvl === UserActivityLevelEnum.SEDENTARY && "Desk job, low exercise"}
                      {lvl === UserActivityLevelEnum.LIGHTLY_ACTIVE && "1–3 sessions/wk"}
                      {lvl === UserActivityLevelEnum.MODERATELY_ACTIVE && "3–5 training days/wk"}
                      {lvl === UserActivityLevelEnum.VERY_ACTIVE && "6–7 intensive sessions"}
                      {lvl === UserActivityLevelEnum.SUPER_ACTIVE && "Athletic heavy volume"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Experience & Diet */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Experience Tier</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.values(ExperienceLevelEnum) as string[]).map((exp) => {
                  const isSelected = experienceLevel === exp;
                  return (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setExperienceLevel(exp)}
                      className={cn(
                        "p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer font-medium",
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                          : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {exp}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Dietary Strategy</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.values(UserDietaryPreferenceEnum) as string[]).map((diet) => {
                  const isSelected = dietaryPreference === diet;
                  return (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setDietaryPreference(diet)}
                      className={cn(
                        "p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer font-medium",
                        isSelected
                          ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-semibold shadow-xs"
                          : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {diet.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Equipment Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Available Training Equipment
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {(Object.values(EquipmentEnum) as string[]).map((eq) => {
                const isSelected = equipmentAvailable.includes(eq);
                return (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => toggleEquipment(eq)}
                    className={cn(
                      "p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer font-medium",
                      isSelected
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                        : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {eq.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border/40">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Committing Calibration...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Commit Bio-Passport Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
