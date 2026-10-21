import type { GenericPlanRecord, GenericPlanDay } from "../types";

export function extractPlanRecord(
  data: GenericPlanRecord | GenericPlanRecord[] | { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] } | undefined
): GenericPlanRecord | null {
  if (!data) return null;
  const raw = Array.isArray(data)
    ? data[0]
    : (data as { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] })?.plan ||
      (data as { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] })?.plans?.[0] ||
      (data as GenericPlanRecord);
  if (raw && (raw._id || raw.planName)) {
    return raw;
  }
  return null;
}

export function normalizeWorkoutDays(plan: GenericPlanRecord | null) {
  if (!plan) return [];
  return (plan.schedule || plan.days || []).map((d: GenericPlanDay, idx: number) => ({
    dayNumber: d.dayNumber ?? idx + 1,
    dayName: d.dayName ?? d.day ?? `Day ${idx + 1}`,
    focus: d.focus || "Targeted Training",
    exercises: d.exercises || [],
  }));
}

export function normalizeMealDays(plan: GenericPlanRecord | null) {
  if (!plan) return [];
  return (plan.schedule || plan.days || []).map((d: GenericPlanDay, idx: number) => {
    const mealsList = d.meals || [];
    const dayTotalCalories = mealsList.reduce((acc, m) => {
      if (m.items && Array.isArray(m.items)) {
        return acc + m.items.reduce((s, it) => s + (it.calories || 0), 0);
      }
      return acc + (m.calories || 0);
    }, 0);

    return {
      dayNumber: d.dayNumber ?? idx + 1,
      dayName: d.dayName ?? d.day ?? `Day ${idx + 1}`,
      totalCalories: dayTotalCalories,
      meals: mealsList,
    };
  });
}
