import React from "react";
import { Calendar, Clock, Dumbbell, History, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkoutLogRecord } from "../types";
import { formatSafeDate } from "../lib/calculations";

interface WorkoutHistoryListProps {
  history: WorkoutLogRecord[];
  isLoadingHistory: boolean;
  selectedDate?: string;
  onSelectLogTab: () => void;
  onDeleteLog: (id: string) => void;
}

export function WorkoutHistoryList({
  history,
  isLoadingHistory,
  selectedDate,
  onSelectLogTab,
  onDeleteLog,
}: WorkoutHistoryListProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <History className="size-4 text-emerald-400" />
            {selectedDate ? `Logged Workouts for ${selectedDate}` : "Logged Workout History"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Complete historical timeline of progressive overload sessions
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
          {history.length} Completed Sessions
        </Badge>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="size-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-mono text-muted-foreground">
              Retrieving session timeline...
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-14 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
              <History className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">
                No workouts logged {selectedDate ? `for ${selectedDate}` : "yet"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Switch to &quot;Log Session&quot; to record your athletic workout for this date.
              </p>
            </div>
            <Button
              size="sm"
              onClick={onSelectLogTab}
              className="bg-primary text-primary-foreground font-semibold text-xs h-8 px-3"
            >
              <Plus className="size-3.5 mr-1" />
              Record First Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div
                key={record._id}
                className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card/40 hover:border-emerald-500/40 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Dumbbell className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        {record.title || record.workoutType || "Workout Session"}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="size-3 text-emerald-400" />
                          {formatSafeDate(record.createdAt || record.date)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="size-3 text-cyan-400" />
                          {record.totalDuration || record.duration || 45} mins
                        </span>
                        <span>•</span>
                        <span className="font-mono text-foreground font-semibold">
                          {record.exercises?.length || 0} exercises
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteLog(record._id)}
                    className="size-8 text-muted-foreground hover:text-rose-400 self-end sm:self-center transition-colors cursor-pointer"
                    aria-label="Delete workout log"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Exercises Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {record.exercises?.map((ex, exIdx) => {
                    const exerciseName =
                      typeof ex.exerciseId === "object" && ex.exerciseId !== null
                        ? (ex.exerciseId as { name?: string }).name
                        : typeof ex.exercise === "object" && ex.exercise !== null
                          ? (ex.exercise as { name?: string }).name
                          : "Movement";

                    const setsCount = Array.isArray(ex.sets) ? ex.sets.length : (ex.sets ?? 1);
                    const repsCount = (Array.isArray(ex.sets) && ex.sets[0] ? ex.sets[0].reps : ex.reps) ?? 10;
                    const weightVal = (Array.isArray(ex.sets) && ex.sets[0] ? ex.sets[0].weight : ex.weight) ?? 0;

                    return (
                      <div
                        key={exIdx}
                        className="p-3 rounded-lg bg-background/50 border border-border/40 text-xs space-y-1"
                      >
                        <p className="font-semibold text-foreground truncate flex items-center justify-between">
                          <span>{exerciseName}</span>
                        </p>
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>{setsCount} sets × {repsCount} reps</span>
                          {weightVal > 0 && (
                            <span className="text-emerald-400 font-bold">{weightVal} kg</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
