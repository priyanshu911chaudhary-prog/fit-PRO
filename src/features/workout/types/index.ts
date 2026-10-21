export interface ExerciseItem {
  _id: string;
  name: string;
  targetMuscle: string;
  equipment: string;
  category: string;
  aliases?: string[];
}

export interface SetRow {
  setNumber: number;
  reps: number;
  weight: number;
}

export interface WorkoutExerciseEntry {
  exerciseId: string;
  name: string;
  targetMuscle?: string;
  sets: SetRow[];
}

export interface WorkoutExerciseLogItem {
  exerciseId?: {
    _id?: string;
    name?: string;
    targetMuscle?: string;
    category?: string;
    equipment?: string;
  } | string;
  exercise?: {
    _id?: string;
    name?: string;
    targetMuscle?: string;
    category?: string;
    equipment?: string;
  } | string;
  sets?: number | Array<{
    setNumber?: number;
    reps?: number;
    weight?: number;
  }>;
  reps?: number;
  weight?: number;
}

export interface WorkoutLogRecord {
  _id: string;
  title?: string;
  workoutType?: string;
  totalDuration?: number;
  duration?: number;
  date?: string;
  createdAt?: string;
  exercises: WorkoutExerciseLogItem[];
}

export interface DailyWorkoutSummary {
  totalVolumeTonnage: number;
  exercisesCount: number;
  totalSetsCount: number;
  totalDuration: number;
  estimatedCaloriesBurn: number;
}
