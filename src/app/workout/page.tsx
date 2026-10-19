"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Dumbbell,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Clock,
  History,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

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

function WorkoutContent() {
  const [activeTab, setActiveTab] = useState("log");

  // Catalog State
  const [exercisesCatalog, setExercisesCatalog] = useState<ExerciseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("");

  // Workout Form State
  const [workoutType, setWorkoutType] = useState("strength");
  const [duration, setDuration] = useState<number>(45);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExerciseEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      .catch(() => {});

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
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddExerciseToWorkout = (exercise: ExerciseItem) => {
    if (workoutExercises.some((e) => e.exerciseId === exercise._id)) {
      toast.info(`${exercise.name} is already added to this workout.`);
      return;
    }

    setWorkoutExercises([
      ...workoutExercises,
      {
        exerciseId: exercise._id,
        name: exercise.name,
        sets: [
          { setNumber: 1, reps: 10, weight: 20 },
          { setNumber: 2, reps: 10, weight: 20 },
          { setNumber: 3, reps: 10, weight: 20 },
        ],
      },
    ]);
    toast.success(`Added ${exercise.name}`);
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
            [field]: value,
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
      toast.error("Please add at least one exercise to your workout.");
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
        toast.success("Workout logged successfully!");
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
        toast.success("Workout log deleted");
        await fetchHistory();
      }
    } catch {
      toast.error("Failed to delete workout log");
    }
  };

  const filteredCatalog = exercisesCatalog.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = selectedMuscle ? item.targetMuscle === selectedMuscle : true;
    return matchesQuery && matchesMuscle;
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Workouts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record training sessions with verified exercise catalog items and track progression.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="log" className="flex items-center gap-2">
            <Plus className="size-4" />
            Log New Workout
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="size-4" />
            Workout History ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LOG WORKOUT */}
        <TabsContent value="log" className="space-y-6">
          <form onSubmit={handleSubmitWorkout}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Form Details & Exercise Selection */}
              <div className="space-y-6">
                <Card className="border-border/60 bg-card/75 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Session Overview</CardTitle>
                    <CardDescription className="text-xs">
                      General details for this workout session
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="date">Session Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="workoutType">Workout Type</Label>
                      <Input
                        id="workoutType"
                        type="text"
                        placeholder="e.g. Chest & Triceps / Upper Body"
                        value={workoutType}
                        onChange={(e) => setWorkoutType(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="duration">Duration (Minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min={5}
                        max={360}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="bg-background/50"
                        required
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Exercise Picker Catalog */}
                <Card className="border-border/60 bg-card/75 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Exercise Catalog</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {filteredCatalog.length} available
                      </span>
                    </CardTitle>
                    <div className="pt-2 space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search exercises..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 text-xs h-9 bg-background/50"
                        />
                      </div>
                      <div className="flex gap-1 overflow-x-auto text-[10px] pb-1">
                        {["", "chest", "back", "legs", "shoulders", "arms", "core"].map((muscle) => (
                          <button
                            key={muscle}
                            type="button"
                            onClick={() => setSelectedMuscle(muscle)}
                            className={`px-2 py-0.5 rounded-md border capitalize shrink-0 transition-all ${
                              selectedMuscle === muscle
                                ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold"
                                : "border-border bg-background/50 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {muscle || "All"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {filteredCatalog.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No exercises matching search.
                        </p>
                      ) : (
                        filteredCatalog.map((exercise) => (
                          <div
                            key={exercise._id}
                            className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-foreground">{exercise.name}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">
                                {exercise.targetMuscle.replace(/_/g, " ")} • {exercise.equipment}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => handleAddExerciseToWorkout(exercise)}
                              className="text-xs h-7 px-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
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

              {/* Right Column: Added Exercises & Sets Table */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">Planned Sets & Reps</CardTitle>
                      <CardDescription className="text-xs">
                        Configure reps and weight (kg) for each exercise in this workout.
                      </CardDescription>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">
                      {workoutExercises.length} Exercises
                    </span>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {workoutExercises.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-3">
                        <Dumbbell className="size-10 opacity-30" />
                        <p>No exercises added yet. Pick exercises from the catalog on the left.</p>
                      </div>
                    ) : (
                      workoutExercises.map((item) => (
                        <div
                          key={item.exerciseId}
                          className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <span className="font-bold text-sm text-foreground flex items-center gap-2">
                              <Dumbbell className="size-4 text-indigo-400" />
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => handleAddSet(item.exerciseId)}
                                className="text-[11px] h-6 px-2"
                              >
                                <Plus className="size-3 mr-1" />
                                Add Set
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="ghost"
                                onClick={() => handleRemoveExercise(item.exerciseId)}
                                className="text-rose-400 hover:text-rose-300 h-6 px-1.5"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Sets Table */}
                          <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-[10px] text-muted-foreground uppercase font-bold px-2">
                              <div className="col-span-2">Set</div>
                              <div className="col-span-5">Reps</div>
                              <div className="col-span-4">Weight (kg)</div>
                              <div className="col-span-1" />
                            </div>

                            {item.sets.map((set, setIdx) => (
                              <div
                                key={setIdx}
                                className="grid grid-cols-12 gap-2 items-center px-2 py-1 rounded-lg bg-background/40"
                              >
                                <div className="col-span-2 text-xs font-bold text-muted-foreground">
                                  #{set.setNumber}
                                </div>
                                <div className="col-span-5">
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
                                    className="h-8 text-xs bg-background/50"
                                  />
                                </div>
                                <div className="col-span-4">
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
                                    className="h-8 text-xs bg-background/50"
                                  />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                  {item.sets.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSet(item.exerciseId, setIdx)}
                                      className="text-muted-foreground hover:text-rose-400 transition-colors"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}

                    {workoutExercises.length > 0 && (
                      <div className="pt-2 flex justify-end">
                        <Button
                          type="submit"
                          id="submit-workout-btn"
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="size-4 mr-2 animate-spin" />
                              Logging Workout...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4 mr-2" />
                              Finish & Save Workout
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
        <TabsContent value="history" className="space-y-4">
          <Card className="border-border/60 bg-card/75 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="size-4 text-indigo-400" />
                Logged Workout History
              </CardTitle>
              <CardDescription className="text-xs">
                Your past training sessions ordered from newest to oldest.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="size-6 text-indigo-500 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  No workouts logged yet. Switch to &quot;Log New Workout&quot; to record your first session!
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((record) => (
                    <div
                      key={record._id}
                      className="p-4 rounded-xl border border-border/60 bg-muted/20 hover:border-indigo-500/30 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <Dumbbell className="size-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-foreground">
                              {record.title || record.workoutType || "Workout Session"}
                            </h4>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {formatSafeDate(record.createdAt || record.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {record.totalDuration || record.duration || 45} mins
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLog(record._id)}
                          className="size-8 text-muted-foreground hover:text-rose-500 self-end sm:self-center"
                          aria-label="Delete workout log"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {/* Exercises breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {record.exercises?.map((ex, exIdx) => {
                          const exerciseName =
                            typeof ex.exerciseId === "object" && ex.exerciseId !== null
                              ? (ex.exerciseId as { name?: string }).name
                              : typeof ex.exercise === "object" && ex.exercise !== null
                              ? (ex.exercise as { name?: string }).name
                              : "Exercise";

                          const setsCount = Array.isArray(ex.sets) ? ex.sets.length : (ex.sets ?? 1);
                          const repsCount = (Array.isArray(ex.sets) && ex.sets[0] ? ex.sets[0].reps : ex.reps) ?? 10;
                          const weightVal = (Array.isArray(ex.sets) && ex.sets[0] ? ex.sets[0].weight : ex.weight) ?? 0;

                          return (
                            <div
                              key={exIdx}
                              className="p-2.5 rounded-lg bg-background/50 border border-border/30 text-xs space-y-1"
                            >
                              <p className="font-semibold text-foreground truncate">
                                {exerciseName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {setsCount} sets × {repsCount} reps {weightVal > 0 ? `(${weightVal} kg)` : ""}
                              </p>
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
      </Tabs>
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl p-8">
          <div className="w-full h-96 rounded-xl bg-card/50 animate-pulse" />
        </div>
      }
    >
      <WorkoutContent />
    </Suspense>
  );
}
