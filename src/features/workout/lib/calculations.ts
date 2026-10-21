import type { WorkoutExerciseEntry } from "../types";

export function formatSafeDate(val?: string | Date): string {
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

export function calculateVolumeTonnage(exercises: WorkoutExerciseEntry[]): number {
  return exercises.reduce((sum, ex) => {
    return (
      sum +
      ex.sets.reduce((sSum, s) => {
        return sSum + (Number(s.reps) || 0) * (Number(s.weight) || 0);
      }, 0)
    );
  }, 0);
}

export function calculateTotalSets(exercises: WorkoutExerciseEntry[]): number {
  return exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
}

export function calculateEstimatedCaloriesBurn(duration: number, volumeTonnage: number): number {
  const base = Number(duration) * 6;
  const volumeBonus = Math.round(volumeTonnage / 120);
  return base + volumeBonus;
}

export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight > 0 && reps > 0) {
    return Math.round(weight * (1 + reps / 30));
  }
  return 0;
}
