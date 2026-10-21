"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import type { ExerciseItem, WorkoutExerciseEntry } from "../types";
import {
  calculateVolumeTonnage,
  calculateTotalSets,
  calculateEstimatedCaloriesBurn,
} from "../lib/calculations";

export function useWorkoutBuilder() {
  const [workoutType, setWorkoutType] = useState("Chest & Triceps");
  const [duration, setDuration] = useState<number>(50);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExerciseEntry[]>([]);

  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  });

  const totalVolumeTonnage = useMemo(() => {
    return calculateVolumeTonnage(workoutExercises);
  }, [workoutExercises]);

  const totalSetsCount = useMemo(() => {
    return calculateTotalSets(workoutExercises);
  }, [workoutExercises]);

  const estimatedCaloriesBurn = useMemo(() => {
    return calculateEstimatedCaloriesBurn(duration, totalVolumeTonnage);
  }, [duration, totalVolumeTonnage]);

  const handleAddExerciseToWorkout = useCallback((exercise: ExerciseItem) => {
    setWorkoutExercises((prev) => {
      if (prev.some((e) => e.exerciseId === exercise._id)) {
        toast.info(`${exercise.name} is already staged in this workout.`);
        return prev;
      }

      toast.success(`Staged ${exercise.name}`, {
        description: "Added with 3 initial working sets.",
      });

      return [
        ...prev,
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
      ];
    });
  }, []);

  const handleRemoveExercise = useCallback((exerciseId: string) => {
    setWorkoutExercises((prev) => prev.filter((e) => e.exerciseId !== exerciseId));
  }, []);

  const handleAddSet = useCallback((exerciseId: string) => {
    setWorkoutExercises((prev) =>
      prev.map((e) => {
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
  }, []);

  const handleRemoveSet = useCallback((exerciseId: string, setIndex: number) => {
    setWorkoutExercises((prev) =>
      prev.map((e) => {
        if (e.exerciseId === exerciseId && e.sets.length > 1) {
          const newSets = e.sets
            .filter((_, idx) => idx !== setIndex)
            .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
          return { ...e, sets: newSets };
        }
        return e;
      })
    );
  }, []);

  const handleUpdateSet = useCallback(
    (
      exerciseId: string,
      setIndex: number,
      field: "reps" | "weight",
      value: number
    ) => {
      setWorkoutExercises((prev) =>
        prev.map((e) => {
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
    },
    []
  );

  const handleAdjustSet = useCallback(
    (
      exerciseId: string,
      setIndex: number,
      field: "reps" | "weight",
      delta: number
    ) => {
      setWorkoutExercises((prev) =>
        prev.map((e) => {
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
    },
    []
  );

  const resetWorkout = useCallback(() => {
    setWorkoutExercises([]);
  }, []);

  return {
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
  };
}
