"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { normalizeDateOnly } from "@/lib/nutrition-engine";
import { aggregateDailyWorkoutMetrics } from "../lib/calculations";
import { useExerciseCatalog } from "../hooks/use-exercise-catalog";
import { useWorkoutBuilder } from "../hooks/use-workout-builder";
import { useWorkoutHistory } from "../hooks/use-workout-history";
import { WorkoutHeader } from "./workout-header";
import { WorkoutTelemetryHud } from "./workout-telemetry-hud";
import { WorkoutSessionOverview } from "./workout-session-overview";
import { ExerciseMovementCatalog } from "./exercise-movement-catalog";
import { WorkoutSetsBuilder } from "./workout-sets-builder";
import { WorkoutHistoryList } from "./workout-history-list";

export function WorkoutPageContent() {
  const [activeTab, setActiveTab] = useState("log");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const todayStr = normalizeDateOnly();

  const {
    filteredCatalog,
    searchQuery,
    setSearchQuery,
    selectedMuscle,
    setSelectedMuscle,
  } = useExerciseCatalog();

  const {
    workoutType,
    setWorkoutType,
    duration,
    setDuration,
    date,
    setDate,
    workoutExercises,
    totalVolumeTonnage: stagedVolumeTonnage,
    totalSetsCount: stagedSetsCount,
    handleAddExerciseToWorkout,
    handleRemoveExercise,
    handleAddSet,
    handleRemoveSet,
    handleUpdateSet,
    handleAdjustSet,
    resetWorkout,
  } = useWorkoutBuilder();

  const {
    selectedDate,
    setSelectedDate,
    history,
    allHistory,
    dailyTotals,
    isLoadingHistory,
    fetchHistory,
    handlePrevDay,
    handleNextDay,
    handleSetToday,
    handleDeleteLog,
  } = useWorkoutHistory();

  const isToday = selectedDate === todayStr;

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (workoutExercises.length === 0) {
      setDate(newDate);
    }
  };

  const combinedDailyTotals = useMemo(() => {
    return aggregateDailyWorkoutMetrics(
      history,
      dailyTotals,
      workoutExercises,
      duration,
      date,
      selectedDate
    );
  }, [history, dailyTotals, workoutExercises, duration, date, selectedDate]);

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
          date: date || selectedDate,
          exercises: workoutExercises.map((ex) => {
            const firstSet = ex.sets[0] || { reps: 10, weight: 0 };
            return {
              exerciseId: ex.exerciseId,
              sets: ex.sets.length,
              reps: Number(firstSet.reps) || 10,
              weight: Number(firstSet.weight) || 0,
            };
          }),
        }),
      });

      if (res.success) {
        toast.success("Workout committed successfully!", {
          description: `Logged ${workoutExercises.length} movements • ${stagedVolumeTonnage} kg volume`,
        });
        resetWorkout();
        await fetchHistory(selectedDate);
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

  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => val && setActiveTab(val)}
      className="container mx-auto max-w-7xl px-4 py-8 space-y-6"
    >
      {/* 1. Header Banner */}
      <WorkoutHeader
        activeTab={activeTab}
        historyCount={allHistory.length > 0 ? allHistory.length : history.length}
        onTabChange={setActiveTab}
      />

      {/* 2. Date Navigation & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">Selected Workout Day:</span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {isToday ? "Today" : selectedDate}
          </span>
          {isToday && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Input
            id="workout-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && handleDateChange(e.target.value)}
            className="w-36 h-8 text-xs font-mono bg-background/60 border-border/70 text-foreground px-2"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSetToday}
            disabled={isToday}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            <Clock className="size-3 mr-1" />
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* 3. Daily Workout Ledger Summary & Telemetry HUD Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            Daily Workout Ledger • {isToday ? "Today" : selectedDate}
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            {history.length} {history.length === 1 ? "committed session" : "committed sessions"}
            {workoutExercises.length > 0 && ` • ${workoutExercises.length} staged in draft`}
          </span>
        </div>

        <WorkoutTelemetryHud
          totalVolumeTonnage={combinedDailyTotals.totalVolumeTonnage}
          exercisesCount={combinedDailyTotals.exercisesCount}
          totalSetsCount={combinedDailyTotals.totalSetsCount}
          estimatedCaloriesBurn={combinedDailyTotals.estimatedCaloriesBurn}
        />
      </div>

      <div className="space-y-6">
        {/* TAB 1: LOG WORKOUT */}
        <TabsContent value="log" className="space-y-6 mt-0">
          <form onSubmit={handleSubmitWorkout}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5 cols): Session Parameters & Exercise Catalog */}
              <div className="lg:col-span-5 space-y-6">
                <WorkoutSessionOverview
                  date={date}
                  onDateChange={(newDate) => {
                    setDate(newDate);
                    setSelectedDate(newDate);
                  }}
                  workoutType={workoutType}
                  onWorkoutTypeChange={setWorkoutType}
                  duration={duration}
                  onDurationChange={setDuration}
                />

                <ExerciseMovementCatalog
                  filteredCatalog={filteredCatalog}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  selectedMuscle={selectedMuscle}
                  onSelectedMuscleChange={setSelectedMuscle}
                  onAddExercise={handleAddExerciseToWorkout}
                />
              </div>

              {/* Right Column (7 cols): Staged Exercises & Working Sets Ledger */}
              <div className="lg:col-span-7 space-y-4">
                <WorkoutSetsBuilder
                  workoutExercises={workoutExercises}
                  totalVolumeTonnage={stagedVolumeTonnage}
                  totalSetsCount={stagedSetsCount}
                  isSubmitting={isSubmitting}
                  onAddSet={handleAddSet}
                  onRemoveSet={handleRemoveSet}
                  onUpdateSet={handleUpdateSet}
                  onAdjustSet={handleAdjustSet}
                  onRemoveExercise={handleRemoveExercise}
                  onSubmit={handleSubmitWorkout}
                />
              </div>
            </div>
          </form>
        </TabsContent>

        {/* TAB 2: HISTORY */}
        <TabsContent value="history" className="space-y-4 mt-0">
          <WorkoutHistoryList
            history={history}
            isLoadingHistory={isLoadingHistory}
            selectedDate={selectedDate}
            onSelectLogTab={() => setActiveTab("log")}
            onDeleteLog={handleDeleteLog}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
