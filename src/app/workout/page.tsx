"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import {
  Dumbbell,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  History,
  CheckCircle2,
  Search,
  Activity,
  Flame,
  Zap,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "cn";

interface ExerciseItem {
  _id: string;
  name: string;
  targetMuscle: string;
  equipment: string;
  category: string;
}

interface SetRow {
  setNumber: number;
  reps: number;
  weight: number;
}

interface WorkoutExerciseEntry {
  exerciseId: string;
  name: string;
  targetMuscle?: string;
  sets: SetRow[];
}

interface WorkoutLogRecord {
  _id: string;
  title?: string;
  workoutType?: string;
  totalDuration?: number;
  duration?: number;
  date?: string;
  createdAt?: string;
  exercises: Array<{
    exerciseId?: {
      _id?: string;
      name?: string;
      targetMuscle?: string;
    } | string;
    exercise?: {
      _id?: string;
      name?: string;
      targetMuscle?: string;
    } | string;
    sets?: number | Array<{
      setNumber?: number;
      reps?: number;
      weight?: number;
    }>;
    reps?: number;
    weight?: number;
  }>;
}

function formatSafeDate(val?: string | Date): string {
  if (!val) return "Today";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "Today";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

const COMMON_SPLITS = [
  "Chest & Triceps",
  "Back & Biceps",
  "Legs & Core",
  "Upper Body Push",
  "Upper Body Pull",
  "Full Body Strength",
];

const MUSCLE_GROUPS = [
  { id: "", label: "All" },
  { id: "chest", label: "Chest" },
  { id: "back", label: "Back" },
  { id: "legs", label: "Legs" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "core", label: "Core" },
];

function WorkoutContent() {
  const [activeTab, setActiveTab] = useState("log");

  // Catalog State
  const [exercisesCatalog, setExercisesCatalog] = useState<ExerciseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("");

  // Workout Form State
  const [workoutType, setWorkoutType] = useState("Chest & Triceps");
  const [duration, setDuration] = useState<number>(50);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExerciseEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  });

  // History State
  const [history, setHistory] = useState<WorkoutLogRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load Catalog
  useEffect(() => {
    let isMounted = true;
    apiClient<{ exercises: ExerciseItem[] }>("/api/exercises?limit=50")
      .then((res) => {
        if (isMounted && res.data?.exercises) {
          setExercisesCatalog(res.data.exercises);
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load History
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await apiClient<{ logs: WorkoutLogRecord[] }>("/api/workout");
      if (res.data?.logs) {
        setHistory(res.data.logs);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient<{ logs: WorkoutLogRecord[] }>("/api/workout")
      .then((res) => {
        if (isMounted && res.data?.logs) {
          setHistory(res.data.logs);
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Telemetry Calculations
  const totalVolumeTonnage = useMemo(() => {
    return workoutExercises.reduce((sum, ex) => {
      return (
        sum +
        ex.sets.reduce((sSum, s) => {
          return sSum + (Number(s.reps) || 0) * (Number(s.weight) || 0);
        }, 0)
      );
    }, 0);
  }, [workoutExercises]);

  const totalSetsCount = useMemo(() => {
    return workoutExercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  }, [workoutExercises]);

  const estimatedCaloriesBurn = useMemo(() => {
    const base = Number(duration) * 6;
    const volumeBonus = Math.round(totalVolumeTonnage / 120);
    return base + volumeBonus;
  }, [duration, totalVolumeTonnage]);

  const handleAddExerciseToWorkout = (exercise: ExerciseItem) => {
    if (workoutExercises.some((e) => e.exerciseId === exercise._id)) {
      toast.info(`${exercise.name} is already staged in this workout.`);
      return;
    }

    setWorkoutExercises([
      ...workoutExercises,
      {
        exerciseId: exercise._id,
        name: exercise.name,
        targetMuscle: exercise.targetMuscle,
        sets: [
          { setNumber: 1, reps: 10, weight: 20 },
          { setNumber: 2, reps: 10, weight: 20 },
          { setNumber: 3, reps: 10, weight: 20 },
        ],
      },
    ]);
    toast.success(`Staged ${exercise.name}`, {
      description: "Added with 3 initial working sets.",
    });
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setWorkoutExercises(workoutExercises.filter((e) => e.exerciseId !== exerciseId));
  };

  const handleAddSet = (exerciseId: string) => {
    setWorkoutExercises(
      workoutExercises.map((e) => {
        if (e.exerciseId === exerciseId) {
          const nextSetNumber = e.sets.length + 1;
          const lastSet = e.sets[e.sets.length - 1];
          return {
            ...e,
            sets: [
              ...e.sets,
              {
                setNumber: nextSetNumber,
                reps: lastSet ? lastSet.reps : 10,
                weight: lastSet ? lastSet.weight : 20,
              },
            ],
          };
        }
        return e;
      })
    );
  };

  const handleRemoveSet = (exerciseId: string, setIndex: number) => {
    setWorkoutExercises(
      workoutExercises.map((e) => {
        if (e.exerciseId === exerciseId && e.sets.length > 1) {
          const newSets = e.sets
            .filter((_, idx) => idx !== setIndex)
            .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
          return { ...e, sets: newSets };
        }
        return e;
      })
    );
  };

  const handleUpdateSet = (
    exerciseId: string,
    setIndex: number,
    field: "reps" | "weight",
    value: number
  ) => {
    setWorkoutExercises(
      workoutExercises.map((e) => {
        if (e.exerciseId === exerciseId) {
          const updatedSets = [...e.sets];
          updatedSets[setIndex] = {
            ...updatedSets[setIndex],
            [field]: Math.max(0, value),
          };
          return { ...e, sets: updatedSets };
        }
        return e;
      })
    );
  };

  const handleAdjustSet = (
    exerciseId: string,
    setIndex: number,
    field: "reps" | "weight",
    delta: number
  ) => {
    setWorkoutExercises(
      workoutExercises.map((e) => {
        if (e.exerciseId === exerciseId) {
          const updatedSets = [...e.sets];
          const curVal = Number(updatedSets[setIndex][field]) || 0;
          const nextVal = Math.max(field === "reps" ? 1 : 0, curVal + delta);
          updatedSets[setIndex] = {
            ...updatedSets[setIndex],
            [field]: Number(nextVal.toFixed(1)),
          };
          return { ...e, sets: updatedSets };
        }
        return e;
      })
    );
  };

  const handleSubmitWorkout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (workoutExercises.length === 0) {
      toast.error("Please add at least one exercise to your session.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient("/api/workout", {
        method: "POST",
        body: JSON.stringify({
          title: workoutType || "Workout Session",
          totalDuration: Number(duration) || 45,
          exercises: workoutExercises.map((e) => {
            const firstSet = e.sets[0] || { reps: 10, weight: 0 };
            return {
              exerciseId: e.exerciseId,
              sets: e.sets.length,
              reps: Number(firstSet.reps) || 10,
              weight: Number(firstSet.weight) || 0,
            };
          }),
        }),
      });

      if (res.success) {
        toast.success("Workout committed successfully!", {
          description: `Logged ${workoutExercises.length} movements • ${totalVolumeTonnage} kg volume`,
        });
        setWorkoutExercises([]);
        await fetchHistory();
        setActiveTab("history");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to log workout";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await apiClient(`/api/workout/${id}`, {
        method: "DELETE",
      });
      if (res.success) {
        toast.success("Session log removed");
        await fetchHistory();
      }
    } catch {
      toast.error("Failed to delete workout log");
    }
  };

  const filteredCatalog = useMemo(() => {
    return exercisesCatalog.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMuscle = selectedMuscle ? item.targetMuscle.toLowerCase() === selectedMuscle.toLowerCase() : true;
      return matchesQuery && matchesMuscle;
    });
  }, [exercisesCatalog, searchQuery, selectedMuscle]);

  return (
    <Tabs value={activeTab} onValueChange={(val) => val && setActiveTab(val)} className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Dumbbell className="size-3.5" />
                OVERLOAD ENGINE
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                TELEMETRY ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Workout & Progressive Overload
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Real-time set logging, tonnage computation, and historical athletic session archive.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TabsList className="bg-background/60 border border-border/70 p-1 rounded-xl">
              <TabsTrigger
                value="log"
                onClick={() => setActiveTab("log")}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "log" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus className="size-3.5" />
                Log Session
              </TabsTrigger>
              <TabsTrigger
                value="history"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "history" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <History className="size-3.5" />
                History ({history.length})
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* TAB 1: LOG WORKOUT */}
        <TabsContent value="log" className="space-y-6 mt-0">
          {/* Live Telemetry HUD Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-emerald-400" />
                  Volume Tonnage
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400">
                  LIVE
                </Badge>
              </div>
              <div className="text-2xl font-extrabold font-mono text-foreground">
                {totalVolumeTonnage.toLocaleString()} <span className="text-xs font-sans text-muted-foreground font-normal">kg</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">Cumulative sets × reps load</p>
            </Card>

            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Layers className="size-3.5 text-cyan-400" />
                  Planned Exercises
                </span>
                <span className="text-[10px] font-mono text-cyan-400">STAGED</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-foreground">
                {workoutExercises.length} <span className="text-xs font-sans text-muted-foreground font-normal">movements</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">Compound & isolated picks</p>
            </Card>

            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Activity className="size-3.5 text-amber-400" />
                  Total Sets
                </span>
                <span className="text-[10px] font-mono text-amber-400">OUTPUT</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-foreground">
                {totalSetsCount} <span className="text-xs font-sans text-muted-foreground font-normal">sets</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">Working stimulus brackets</p>
            </Card>

            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Flame className="size-3.5 text-purple-400" />
                  Estimated Burn
                </span>
                <span className="text-[10px] font-mono text-purple-400">EXPENDITURE</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-foreground">
                ~{estimatedCaloriesBurn} <span className="text-xs font-sans text-muted-foreground font-normal">kcal</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">Metabolic caloric expenditure</p>
            </Card>
          </div>

          <form onSubmit={handleSubmitWorkout}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5 cols): Session Parameters & Exercise Catalog */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1. Session Overview Card */}
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
                        onChange={(e) => setDate(e.target.value)}
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
                        onChange={(e) => setWorkoutType(e.target.value)}
                        className="bg-background/50 border-border/70 text-foreground text-xs h-9"
                        required
                      />
                      {/* Quick Split Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {COMMON_SPLITS.map((split) => (
                          <button
                            key={split}
                            type="button"
                            onClick={() => setWorkoutType(split)}
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
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9 w-24"
                          required
                        />
                        <div className="flex gap-1 overflow-x-auto">
                          {[30, 45, 60, 75, 90].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => setDuration(mins)}
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

                {/* 2. Exercise Catalog Card */}
                <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Search className="size-4 text-cyan-400" />
                        Movement Catalog
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground">
                        {filteredCatalog.length} available
                      </Badge>
                    </div>

                    {/* Search & Muscle Group Chips */}
                    <div className="pt-2 space-y-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search bench press, squat, curl..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 text-xs h-8 bg-background/50 border-border/70 text-foreground"
                        />
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
                        {MUSCLE_GROUPS.map((mg) => (
                          <button
                            key={mg.id}
                            type="button"
                            onClick={() => setSelectedMuscle(mg.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-md border shrink-0 transition-all cursor-pointer font-medium",
                              selectedMuscle === mg.id
                                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-bold shadow-xs"
                                : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                            )}
                          >
                            {mg.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3">
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {filteredCatalog.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No movements found matching query.
                        </div>
                      ) : (
                        filteredCatalog.map((exercise) => (
                          <div
                            key={exercise._id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/30 transition-all group"
                          >
                            <div className="space-y-0.5 min-w-0 pr-2">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-400 transition-colors">
                                {exercise.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground capitalize">
                                <span className="text-emerald-400 font-mono">
                                  {exercise.targetMuscle.replace(/_/g, " ")}
                                </span>
                                <span>•</span>
                                <span>{exercise.equipment}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddExerciseToWorkout(exercise)}
                              className="h-7 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer shrink-0"
                            >
                              <Plus className="size-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (7 cols): Staged Exercises & Working Sets Ledger */}
              <div className="lg:col-span-7 space-y-4">
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
                                  onClick={() => handleAddSet(item.exerciseId)}
                                  className="h-7 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  <Plus className="size-3 mr-1" />
                                  Add Set
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRemoveExercise(item.exerciseId)}
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
                                const est1RM =
                                  set.weight > 0 && set.reps > 0
                                    ? Math.round(set.weight * (1 + set.reps / 30))
                                    : 0;

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
                                        onClick={() => handleAdjustSet(item.exerciseId, setIdx, "reps", -1)}
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
                                          handleUpdateSet(
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
                                        onClick={() => handleAdjustSet(item.exerciseId, setIdx, "reps", 1)}
                                        className="size-7 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                                      >
                                        <Plus className="size-3" />
                                      </button>
                                    </div>

                                    {/* Weight Column with +/- 2.5kg Steppers */}
                                    <div className="col-span-4 flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustSet(item.exerciseId, setIdx, "weight", -2.5)}
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
                                          handleUpdateSet(
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
                                        onClick={() => handleAdjustSet(item.exerciseId, setIdx, "weight", 2.5)}
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
                                          onClick={() => handleRemoveSet(item.exerciseId, setIdx)}
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
              </div>
            </div>
          </form>
        </TabsContent>

        {/* TAB 2: HISTORY */}
        <TabsContent value="history" className="space-y-4 mt-0">
          <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <History className="size-4 text-emerald-400" />
                  Logged Workout History
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
                    <p className="font-semibold text-foreground text-sm">No workouts logged yet</p>
                    <p className="text-[11px] text-muted-foreground">
                      Switch to &quot;Log Session&quot; to record your first athletic workout.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("log")}
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
                          onClick={() => handleDeleteLog(record._id)}
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
        </TabsContent>
      </div>
    </Tabs>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
