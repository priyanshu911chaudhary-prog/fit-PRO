import React from "react";
import { Activity, CheckCircle2, Dumbbell, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkoutExerciseEntry } from "../types";
import { estimateOneRepMax } from "../lib/calculations";

interface WorkoutSetsBuilderProps {
  workoutExercises: WorkoutExerciseEntry[];
  totalVolumeTonnage: number;
  totalSetsCount: number;
  isSubmitting: boolean;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setIndex: number) => void;
  onUpdateSet: (exerciseId: string, setIndex: number, field: "reps" | "weight", value: number) => void;
  onAdjustSet: (exerciseId: string, setIndex: number, field: "reps" | "weight", delta: number) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function WorkoutSetsBuilder({
  workoutExercises,
  totalVolumeTonnage,
  totalSetsCount,
  isSubmitting,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onAdjustSet,
  onRemoveExercise,
  onSubmit,
}: WorkoutSetsBuilderProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="size-4 text-emerald-400" />
            Working Sets & Tonnage
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure reps, weight plates, and track calculated 1RM
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
          {workoutExercises.length} Movements Staged
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {workoutExercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center">
              <Dumbbell className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No exercises staged yet</p>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Pick exercises from the catalog on the left to start logging reps, weights, and overload volume.
              </p>
            </div>
          </div>
        ) : (
          workoutExercises.map((item) => {
            const movementVolume = item.sets.reduce(
              (sum, s) => sum + (Number(s.reps) || 0) * (Number(s.weight) || 0),
              0
            );

            return (
              <div
                key={item.exerciseId}
                className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-3 relative group"
              >
                {/* Movement Header */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Dumbbell className="size-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground">
                        {item.name}
                      </span>
                      {item.targetMuscle && (
                        <span className="ml-2 text-[10px] font-mono uppercase text-emerald-400">
                          {item.targetMuscle.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground mr-1">
                      Vol: <strong className="text-foreground">{movementVolume} kg</strong>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onAddSet(item.exerciseId)}
                      className="h-7 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      <Plus className="size-3 mr-1" />
                      Add Set
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => onRemoveExercise(item.exerciseId)}
                      className="size-7 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                      aria-label="Remove movement"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Sets Table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground font-mono uppercase px-2">
                    <div className="col-span-2">Set</div>
                    <div className="col-span-4">Reps</div>
                    <div className="col-span-4">Load (kg)</div>
                    <div className="col-span-2 text-right">Est. 1RM</div>
                  </div>

                  {item.sets.map((set, setIdx) => {
                    const est1RM = estimateOneRepMax(set.weight, set.reps);

                    return (
                      <div
                        key={setIdx}
                        className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 rounded-lg bg-background/50 border border-border/40 hover:border-border/70 transition-colors"
                      >
                        <div className="col-span-2 text-xs font-mono font-bold text-muted-foreground">
                          #{set.setNumber}
                        </div>

                        {/* Reps Column with +/- Steppers */}
                        <div className="col-span-4 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onAdjustSet(item.exerciseId, setIdx, "reps", -1)}
                            className="size-7 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                          >
                            <Minus className="size-3" />
                          </button>
                          <Input
                            type="number"
                            min={1}
                            max={500}
                            value={set.reps}
                            onChange={(e) =>
                              onUpdateSet(
                                item.exerciseId,
                                setIdx,
                                "reps",
                                Number(e.target.value)
                              )
                            }
                            className="h-7 text-xs font-mono text-center bg-background/60 border-border/70 text-foreground px-1"
                          />
                          <button
                            type="button"
                            onClick={() => onAdjustSet(item.exerciseId, setIdx, "reps", 1)}
                            className="size-7 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        {/* Weight Column with +/- 2.5kg Steppers */}
                        <div className="col-span-4 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onAdjustSet(item.exerciseId, setIdx, "weight", -2.5)}
                            className="h-7 px-1.5 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-[10px] font-mono"
                            title="-2.5 kg"
                          >
                            -2.5
                          </button>
                          <Input
                            type="number"
                            min={0}
                            max={1000}
                            step="0.5"
                            value={set.weight}
                            onChange={(e) =>
                              onUpdateSet(
                                item.exerciseId,
                                setIdx,
                                "weight",
                                Number(e.target.value)
                              )
                            }
                            className="h-7 text-xs font-mono text-center bg-background/60 border-border/70 text-foreground px-1"
                          />
                          <button
                            type="button"
                            onClick={() => onAdjustSet(item.exerciseId, setIdx, "weight", 2.5)}
                            className="h-7 px-1.5 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-[10px] font-mono"
                            title="+2.5 kg"
                          >
                            +2.5
                          </button>
                        </div>

                        {/* 1RM + Delete */}
                        <div className="col-span-2 flex items-center justify-end gap-1.5">
                          <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                            {est1RM > 0 ? `${est1RM}kg` : "--"}
                          </span>
                          {item.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onRemoveSet(item.exerciseId, setIdx)}
                              className="text-muted-foreground hover:text-rose-400 transition-colors p-1"
                              aria-label="Remove set"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {workoutExercises.length > 0 && (
          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground font-mono">
              Total Tonnage: <strong className="text-emerald-400 font-bold">{totalVolumeTonnage} kg</strong> across {totalSetsCount} sets
            </div>

            <Button
              type="submit"
              id="submit-workout-btn"
              disabled={isSubmitting}
              onClick={onSubmit}
              className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Committing Session...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Commit Workout Session
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
