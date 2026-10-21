"use client";

import React, { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
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
    totalVolumeTonnage,
    totalSetsCount,
    estimatedCaloriesBurn,
    handleAddExerciseToWorkout,
    handleRemoveExercise,
    handleAddSet,
    handleRemoveSet,
    handleUpdateSet,
    handleAdjustSet,
    resetWorkout,
  } = useWorkoutBuilder();

  const { history, isLoadingHistory, fetchHistory, handleDeleteLog } = useWorkoutHistory();

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
          description: `Logged ${workoutExercises.length} movements • ${totalVolumeTonnage} kg volume`,
        });
        resetWorkout();
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

  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => val && setActiveTab(val)}
      className="container mx-auto max-w-7xl px-4 py-8 space-y-8"
    >
      {/* 1. Header Banner */}
      <WorkoutHeader
        activeTab={activeTab}
        historyCount={history.length}
        onTabChange={setActiveTab}
      />

      <div className="space-y-6">
        {/* TAB 1: LOG WORKOUT */}
        <TabsContent value="log" className="space-y-6 mt-0">
          {/* Live Telemetry HUD Strip */}
          <WorkoutTelemetryHud
            totalVolumeTonnage={totalVolumeTonnage}
            exercisesCount={workoutExercises.length}
            totalSetsCount={totalSetsCount}
            estimatedCaloriesBurn={estimatedCaloriesBurn}
          />

          <form onSubmit={handleSubmitWorkout}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5 cols): Session Parameters & Exercise Catalog */}
              <div className="lg:col-span-5 space-y-6">
                <WorkoutSessionOverview
                  date={date}
                  onDateChange={setDate}
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
                  totalVolumeTonnage={totalVolumeTonnage}
                  totalSetsCount={totalSetsCount}
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
            onSelectLogTab={() => setActiveTab("log")}
            onDeleteLog={handleDeleteLog}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
