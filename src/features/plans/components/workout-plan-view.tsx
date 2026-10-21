import React from "react";
import { Dumbbell, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GenericPlanRecord } from "../types";
import { normalizeWorkoutDays } from "../lib/plan-helpers";

interface WorkoutPlanViewProps {
  workoutPlan: GenericPlanRecord | null;
  isLoadingWorkout: boolean;
  isGeneratingWorkout: boolean;
  onGenerateWorkout: () => void;
}

export function WorkoutPlanView({
  workoutPlan,
  isLoadingWorkout,
  isGeneratingWorkout,
  onGenerateWorkout,
}: WorkoutPlanViewProps) {
  if (isLoadingWorkout) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="size-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-muted-foreground">
          Retrieving active workout split...
        </p>
      </div>
    );
  }

  if (!workoutPlan) {
    return (
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl text-center p-14 space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Dumbbell className="size-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">No Active Workout Protocol</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Initialize an algorithmic multi-day training split customized to your experience level and equipment availability.
          </p>
        </div>
        <Button
          onClick={onGenerateWorkout}
          disabled={isGeneratingWorkout}
          className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4 shadow-md shadow-emerald-500/20 cursor-pointer"
        >
          {isGeneratingWorkout ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Formulating...
            </>
          ) : (
            <>
              <Sparkles className="size-4 mr-2" />
              Formulate Workout Protocol
            </>
          )}
        </Button>
      </Card>
    );
  }

  const workoutDays = normalizeWorkoutDays(workoutPlan);

  return (
    <div className="space-y-6">
      {/* Plan Header Card */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-border/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-xl font-bold text-foreground">
                {workoutPlan.planName}
              </CardTitle>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono font-bold">
                ACTIVE PROTOCOL
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-3 font-mono">
              <span>{workoutDays.length} Scheduled Days</span>
              <span>•</span>
              <span>
                Formulated{" "}
                {workoutPlan.createdAt
                  ? new Date(workoutPlan.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Recently"}
              </span>
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* 3-Day Sequential Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workoutDays.map((day) => (
          <Card
            key={day.dayNumber}
            className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl hover:border-emerald-500/40 transition-all flex flex-col shadow-lg"
          >
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                    0{day.dayNumber}
                  </span>
                  {day.dayName}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground">
                  {day.focus}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-3 space-y-2.5 flex-1">
              {day.exercises?.map((ex, exIdx: number) => (
                <div
                  key={exIdx}
                  className="p-3 rounded-xl bg-card/40 border border-border/50 text-xs space-y-1 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{ex.name}</p>
                    <span className="font-mono text-emerald-400 font-bold text-[11px] shrink-0 ml-2">
                      {ex.sets} sets × {ex.reps}
                    </span>
                  </div>
                  {ex.notes && (
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-sans">
                      {ex.notes}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
