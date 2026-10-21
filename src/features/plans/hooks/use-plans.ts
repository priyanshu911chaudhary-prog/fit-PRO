"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { GenericPlanRecord, PlanType } from "../types";
import { extractPlanRecord } from "../lib/plan-helpers";

type PlanApiResponse = GenericPlanRecord | GenericPlanRecord[] | { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] };

export function usePlans() {
  const [planType, setPlanType] = useState<PlanType>("workout");

  // Workout Plans State
  const [workoutPlan, setWorkoutPlan] = useState<GenericPlanRecord | null>(null);
  const [isLoadingWorkout, setIsLoadingWorkout] = useState(true);
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);

  // Meal Plans State
  const [mealPlan, setMealPlan] = useState<GenericPlanRecord | null>(null);
  const [isLoadingMeal, setIsLoadingMeal] = useState(true);
  const [isGeneratingMeal, setIsGeneratingMeal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient<PlanApiResponse>("/api/workout/ai/savedplan")
      .then((res) => {
        if (isMounted) {
          const raw = extractPlanRecord(res.data);
          if (raw) setWorkoutPlan(raw);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingWorkout(false);
      });

    apiClient<PlanApiResponse>("/api/meal/ai/savedplan")
      .then((res) => {
        if (isMounted) {
          const raw = extractPlanRecord(res.data);
          if (raw) setMealPlan(raw);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingMeal(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGenerateWorkoutPlan = useCallback(async () => {
    try {
      setIsGeneratingWorkout(true);
      const res = await apiClient<GenericPlanRecord | { plan?: GenericPlanRecord }>("/api/workout/ai/generate", {
        method: "POST",
      });

      const plan = (res.data as { plan?: GenericPlanRecord })?.plan || (res.data as GenericPlanRecord);
      if (res.success && plan && (plan._id || plan.planName)) {
        setWorkoutPlan(plan);
        toast.success("New AI Workout Protocol formulated & activated!");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to generate workout plan. Please verify profile baseline.";
      toast.error(msg);
    } finally {
      setIsGeneratingWorkout(false);
    }
  }, []);

  const handleGenerateMealPlan = useCallback(async () => {
    try {
      setIsGeneratingMeal(true);
      const res = await apiClient<GenericPlanRecord | { plan?: GenericPlanRecord }>("/api/meal/ai/generate", {
        method: "POST",
      });

      const plan = (res.data as { plan?: GenericPlanRecord })?.plan || (res.data as GenericPlanRecord);
      if (res.success && plan && (plan._id || plan.planName)) {
        setMealPlan(plan);
        toast.success("New AI Nutrition Protocol formulated & activated!");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to generate meal plan. Please verify profile baseline.";
      toast.error(msg);
    } finally {
      setIsGeneratingMeal(false);
    }
  }, []);

  return {
    planType,
    setPlanType,
    workoutPlan,
    isLoadingWorkout,
    isGeneratingWorkout,
    mealPlan,
    isLoadingMeal,
    isGeneratingMeal,
    handleGenerateWorkoutPlan,
    handleGenerateMealPlan,
  };
}
