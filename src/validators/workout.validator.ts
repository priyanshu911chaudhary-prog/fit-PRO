import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const workoutExerciseItemSchema = z.preprocess((val: unknown) => {
  if (typeof val === "object" && val !== null) {
    const item = val as Record<string, unknown>;
    const exerciseId = item.exerciseId || item.exercise;

    // If sets is provided as an array of set rows: [{ reps, weight }]
    if (Array.isArray(item.sets) && item.sets.length > 0) {
      const setsCount = item.sets.length;
      const firstSet = item.sets[0] as Record<string, unknown>;
      const reps = Number(firstSet.reps) || 10;
      const weight = Number(firstSet.weight) || 0;
      return {
        exerciseId,
        sets: setsCount,
        reps,
        weight,
      };
    }

    return {
      exerciseId,
      sets: typeof item.sets === "number" ? item.sets : Number(item.sets) || 1,
      reps: typeof item.reps === "number" ? item.reps : Number(item.reps) || 10,
      weight: typeof item.weight === "number" ? item.weight : Number(item.weight) || 0,
    };
  }
  return val;
}, z.object({
  exerciseId: z
    .string()
    .regex(objectIdRegex, "Invalid exercise ID format"),
  sets: z
    .number()
    .min(1, "Sets must be at least 1")
    .max(100, "Sets cannot exceed 100"),
  reps: z
    .number()
    .min(1, "Reps must be at least 1")
    .max(500, "Reps cannot exceed 500"),
  weight: z
    .number()
    .min(0, "Weight cannot be negative")
    .max(500, "Weight cannot exceed 500kg")
    .default(0),
}));

export const logWorkoutSchema = z.preprocess((val: unknown) => {
  if (typeof val === "object" && val !== null) {
    const data = val as Record<string, unknown>;
    return {
      ...data,
      title: data.title || data.workoutType || "Workout Session",
      totalDuration:
        typeof data.totalDuration === "number"
          ? data.totalDuration
          : typeof data.duration === "number"
          ? data.duration
          : Number(data.totalDuration || data.duration) || 45,
    };
  }
  return val;
}, z.object({
  title: z
    .string()
    .min(1, "Workout title cannot be empty")
    .max(100, "Workout title cannot exceed 100 characters")
    .trim(),
  totalDuration: z
    .number()
    .min(1, "Total duration must be at least 1 minute")
    .max(1440, "Total duration cannot exceed 24 hours"),
  exercises: z
    .array(workoutExerciseItemSchema)
    .min(1, "At least one exercise must be logged"),
  completionPercentage: z.number().min(0).max(100).default(100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
    .optional(),
}));

export const workoutHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
    .optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type WorkoutExerciseItemInput = z.infer<typeof workoutExerciseItemSchema>;
export type LogWorkoutInput = z.infer<typeof logWorkoutSchema>;
export type WorkoutHistoryQueryInput = z.infer<typeof workoutHistoryQuerySchema>;
