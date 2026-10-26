"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPreferencesData } from "@/features/leaderboard/hooks/use-leaderboard";
import { UpdateLeaderboardPreferencesInput } from "@/validators/leaderboard.validator";
import { Trophy, ShieldCheck, Calendar, Info, Loader2 } from "lucide-react";

interface LeaderboardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: UserPreferencesData | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (data: UpdateLeaderboardPreferencesInput) => Promise<boolean>;
}

interface SettingsFormProps {
  preferences: UserPreferencesData | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (data: UpdateLeaderboardPreferencesInput) => Promise<boolean>;
}

function SettingsForm({ preferences, isSaving, onClose, onSave }: SettingsFormProps) {
  const [optIn, setOptIn] = useState<boolean>(preferences?.optIn ?? true);
  const [displayName, setDisplayName] = useState<string>(preferences?.displayName ?? "");
  const [weeklyWorkoutGoal, setWeeklyWorkoutGoal] = useState<number>(preferences?.weeklyWorkoutGoal ?? 3);
  const [dailyProteinTarget, setDailyProteinTarget] = useState<number>(preferences?.dailyProteinTarget ?? 120);
  const [dailyHydrationTarget, setDailyHydrationTarget] = useState<number>(preferences?.dailyHydrationTarget ?? 2500);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      optIn,
      displayName: displayName.trim(),
      weeklyWorkoutGoal,
      dailyProteinTarget,
      dailyHydrationTarget,
    });
  };

  const hasPendingGoals =
    preferences?.pendingGoalsEffectiveWeekStart &&
    (preferences.pendingWeeklyWorkoutGoal !== undefined ||
      preferences.pendingDailyProteinTarget !== undefined ||
      preferences.pendingDailyHydrationTarget !== undefined);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Opt-in Toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
        <div className="space-y-0.5">
          <Label htmlFor="opt-in-toggle" className="text-sm font-medium cursor-pointer">
            Public Participation
          </Label>
          <p className="text-xs text-muted-foreground">
            Display your score on the global weekly leaderboard.
          </p>
        </div>
        <input
          id="opt-in-toggle"
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
          className="w-4 h-4 rounded text-primary focus:ring-primary border-muted-foreground/30"
        />
      </div>

      {/* Display Name */}
      <div className="space-y-1.5">
        <Label htmlFor="display-name" className="text-xs font-medium">
          Public Display Name
        </Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Athlete"
          minLength={3}
          maxLength={30}
          required
          className="text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          Your email and private identity are never revealed publicly.
        </p>
      </div>

      {/* Goals Section */}
      <div className="space-y-3 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Competition Target Goals
          </Label>
          <Badge variant="outline" className="text-[10px] font-normal py-0">
            Fairness Policy
          </Badge>
        </div>

        {/* Workout Goal */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <Label htmlFor="workout-goal">Weekly Workouts Goal</Label>
            <span className="font-semibold text-primary">{weeklyWorkoutGoal} sessions</span>
          </div>
          <Input
            id="workout-goal"
            type="number"
            min={1}
            max={14}
            value={weeklyWorkoutGoal}
            onChange={(e) => setWeeklyWorkoutGoal(Math.max(1, Math.min(14, Number(e.target.value))))}
          />
        </div>

        {/* Protein Target */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <Label htmlFor="protein-target">Daily Protein Target</Label>
            <span className="font-semibold text-primary">{dailyProteinTarget} g</span>
          </div>
          <Input
            id="protein-target"
            type="number"
            min={30}
            max={350}
            value={dailyProteinTarget}
            onChange={(e) => setDailyProteinTarget(Math.max(30, Math.min(350, Number(e.target.value))))}
          />
        </div>

        {/* Hydration Target */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <Label htmlFor="hydration-target">Daily Hydration Target</Label>
            <span className="font-semibold text-primary">{dailyHydrationTarget} ml</span>
          </div>
          <Input
            id="hydration-target"
            type="number"
            min={500}
            max={6000}
            step={50}
            value={dailyHydrationTarget}
            onChange={(e) => setDailyHydrationTarget(Math.max(500, Math.min(6000, Number(e.target.value))))}
          />
        </div>
      </div>

      {/* Pending Goals Notice */}
      {hasPendingGoals && (
        <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-900 dark:text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            <span>Scheduled Target Update</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            You have pending changes taking effect on{" "}
            <strong>{preferences?.pendingGoalsEffectiveWeekStart}</strong> (Next Monday):
            {preferences?.pendingWeeklyWorkoutGoal !== undefined && (
              <span className="block">· Workouts: {preferences.pendingWeeklyWorkoutGoal} sessions</span>
            )}
            {preferences?.pendingDailyProteinTarget !== undefined && (
              <span className="block">· Protein: {preferences.pendingDailyProteinTarget}g</span>
            )}
            {preferences?.pendingDailyHydrationTarget !== undefined && (
              <span className="block">· Water: {preferences.pendingDailyHydrationTarget}ml</span>
            )}
          </p>
        </div>
      )}

      {/* Fairness notice */}
      <div className="p-2.5 rounded-lg bg-muted/60 text-muted-foreground text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-medium text-foreground">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Monday Boundary Policy</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          To prevent mid-week score manipulation, target changes become effective on the upcoming Monday (00:00 IST). Opt-out takes effect immediately.
        </p>
      </div>

      <DialogFooter className="pt-2 sm:justify-between flex-row items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Privacy Protected</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

export function LeaderboardSettingsDialog({
  open,
  onOpenChange,
  preferences,
  isLoading,
  isSaving,
  onSave,
}: LeaderboardSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Leaderboard Settings</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Manage your public participation, display name, and competition targets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          open && (
            <SettingsForm
              key={preferences ? `${preferences.displayName}-${preferences.optIn}` : "initial"}
              preferences={preferences}
              isSaving={isSaving}
              onClose={() => onOpenChange(false)}
              onSave={onSave}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
