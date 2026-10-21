import React from "react";
import { Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";
import { COMMON_SPLITS } from "../lib/constants";

interface WorkoutSessionOverviewProps {
  date: string;
  onDateChange: (date: string) => void;
  workoutType: string;
  onWorkoutTypeChange: (type: string) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
}

export function WorkoutSessionOverview({
  date,
  onDateChange,
  workoutType,
  onWorkoutTypeChange,
  duration,
  onDurationChange,
}: WorkoutSessionOverviewProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="size-4 text-emerald-400" />
          Session Overview
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Target split parameters and estimated training duration
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-xs font-medium text-muted-foreground">
            Session Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workoutType" className="text-xs font-medium text-muted-foreground">
            Workout Split / Focus
          </Label>
          <Input
            id="workoutType"
            type="text"
            placeholder="e.g. Chest & Triceps"
            value={workoutType}
            onChange={(e) => onWorkoutTypeChange(e.target.value)}
            className="bg-background/50 border-border/70 text-foreground text-xs h-9"
            required
          />
          {/* Quick Split Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {COMMON_SPLITS.map((split) => (
              <button
                key={split}
                type="button"
                onClick={() => onWorkoutTypeChange(split)}
                className={cn(
                  "text-[10px] font-medium px-2 py-1 rounded-md border transition-all cursor-pointer",
                  workoutType === split
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                {split}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="duration" className="text-xs font-medium text-muted-foreground">
              Duration
            </Label>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {duration} mins
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id="duration"
              type="number"
              min={5}
              max={360}
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9 w-24"
              required
            />
            <div className="flex gap-1 overflow-x-auto">
              {[30, 45, 60, 75, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onDurationChange(mins)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-[11px] font-mono border transition-all cursor-pointer",
                    duration === mins
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
