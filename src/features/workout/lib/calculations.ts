import type {
  WorkoutExerciseEntry,
  DailyWorkoutSummary,
  WorkoutLogRecord,
} from "../types";

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
  if (duration <= 0 && volumeTonnage <= 0) return 0;
  const base = Math.max(0, Number(duration)) * 6;
  const volumeBonus = Math.round(Math.max(0, volumeTonnage) / 120);
  return base + volumeBonus;
}

export function estimateOneRepMax(weight: number, reps: number): number {
  if (weight > 0 && reps > 0) {
    return Math.round(weight * (1 + reps / 30));
  }
  return 0;
}

export function aggregateDailyWorkoutMetrics(
  persistedLogs: WorkoutLogRecord[] = [],
  persistedDailyTotals: DailyWorkoutSummary | undefined,
  stagedExercises: WorkoutExerciseEntry[] = [],
  stagedDuration: number = 0,
  stagedDate: string = "",
  selectedDate: string = ""
): DailyWorkoutSummary {
  const isStagedForSelectedDate =
    Boolean(stagedDate) &&
    Boolean(selectedDate) &&
    stagedDate === selectedDate &&
    stagedExercises.length > 0;

  let baseVolume = 0;
  let baseSets = 0;
  let baseDuration = 0;
  const distinctExerciseIds = new Set<string>();

  if (persistedDailyTotals) {
    baseVolume = persistedDailyTotals.totalVolumeTonnage || 0;
    baseSets = persistedDailyTotals.totalSetsCount || 0;
    baseDuration = persistedDailyTotals.totalDuration || 0;
  }

  // Collect distinct exercise IDs from persisted logs
  for (const log of persistedLogs) {
    if (!persistedDailyTotals) {
      baseDuration += Number(log.totalDuration || log.duration) || 0;
    }
    for (const ex of log.exercises || []) {
      if (!persistedDailyTotals) {
        const sCount = Array.isArray(ex.sets) ? ex.sets.length : Number(ex.sets) || 1;
        const reps = (Array.isArray(ex.sets) && ex.sets[0] ? ex.sets[0].reps : ex.reps) || 0;
        const weight = (Array.isArray(ex.sets) && ex.sets[0] ? ex.sets[0].weight : ex.weight) || 0;
        if (reps > 0) {
          baseVolume += sCount * reps * weight;
          baseSets += sCount;
        }
      }
      const rawId =
        typeof ex.exerciseId === "object" && ex.exerciseId !== null && "_id" in ex.exerciseId
          ? (ex.exerciseId as { _id?: string })._id
          : typeof ex.exercise === "object" && ex.exercise !== null && "_id" in ex.exercise
          ? (ex.exercise as { _id?: string })._id
          : ex.exerciseId || ex.exercise;
      if (rawId) {
        distinctExerciseIds.add(String(rawId));
      }
    }
  }

  // Add staged exercises if they belong to the selected date
  let stagedVolume = 0;
  let stagedSets = 0;
  if (isStagedForSelectedDate) {
    for (const ex of stagedExercises) {
      if (ex.exerciseId) {
        distinctExerciseIds.add(String(ex.exerciseId));
      }
      for (const s of ex.sets) {
        const reps = Number(s.reps) || 0;
        const weight = Number(s.weight) || 0;
        if (reps > 0) {
          stagedVolume += reps * weight;
          stagedSets += 1;
        }
      }
    }
  }

  const totalVolumeTonnage = baseVolume + stagedVolume;
  const totalSetsCount = baseSets + stagedSets;
  const totalDuration = baseDuration + (isStagedForSelectedDate ? Number(stagedDuration) || 0 : 0);
  const baseExercisesCount = persistedDailyTotals?.exercisesCount ?? distinctExerciseIds.size;
  const exercisesCount = Math.max(baseExercisesCount, distinctExerciseIds.size);
  const estimatedCaloriesBurn = calculateEstimatedCaloriesBurn(totalDuration, totalVolumeTonnage);

  return {
    totalVolumeTonnage,
    exercisesCount,
    totalSetsCount,
    totalDuration,
    estimatedCaloriesBurn,
  };
}
