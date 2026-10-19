"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Sparkles,
  Dumbbell,
  Utensils,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface GenericPlanDay {
  dayNumber?: number;
  dayName?: string;
  day?: string;
  focus?: string;
  exercises?: Array<{
    name: string;
    sets?: number;
    reps?: string | number;
    notes?: string;
  }>;
  meals?: Array<{
    name?: string;
    servingSize?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    mealType?: string;
    items?: Array<{
      name: string;
      servingSize?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }>;
  }>;
}

interface GenericPlanRecord {
  _id?: string;
  planName?: string;
  isActive?: boolean;
  schedule?: GenericPlanDay[];
  days?: GenericPlanDay[];
  createdAt?: string;
}

function PlansContent() {
  const [planType, setPlanType] = useState<"workout" | "meal">("workout");

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
    apiClient<GenericPlanRecord | GenericPlanRecord[] | { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] }>("/api/workout/ai/savedplan")
      .then((res) => {
        if (isMounted) {
          const raw = Array.isArray(res.data)
            ? res.data[0]
            : (res.data as { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] })?.plan ||
              (res.data as { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] })?.plans?.[0] ||
              (res.data as GenericPlanRecord);
          if (raw && (raw._id || raw.planName)) setWorkoutPlan(raw);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingWorkout(false);
      });

    apiClient<GenericPlanRecord | GenericPlanRecord[] | { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] }>("/api/meal/ai/savedplan")
      .then((res) => {
        if (isMounted) {
          const raw = Array.isArray(res.data)
            ? res.data[0]
            : (res.data as { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] })?.plan ||
              (res.data as { plan?: GenericPlanRecord; plans?: GenericPlanRecord[] })?.plans?.[0] ||
              (res.data as GenericPlanRecord);
          if (raw && (raw._id || raw.planName)) setMealPlan(raw);
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

  const handleGenerateWorkoutPlan = async () => {
    try {
      setIsGeneratingWorkout(true);
      const res = await apiClient<GenericPlanRecord | { plan?: GenericPlanRecord }>("/api/workout/ai/generate", {
        method: "POST",
      });

      const plan = (res.data as { plan?: GenericPlanRecord })?.plan || (res.data as GenericPlanRecord);
      if (res.success && plan && (plan._id || plan.planName)) {
        setWorkoutPlan(plan);
        toast.success("New AI Workout Plan generated & activated!");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to generate workout plan. Please ensure profile is complete.";
      toast.error(msg);
    } finally {
      setIsGeneratingWorkout(false);
    }
  };

  const handleGenerateMealPlan = async () => {
    try {
      setIsGeneratingMeal(true);
      const res = await apiClient<GenericPlanRecord | { plan?: GenericPlanRecord }>("/api/meal/ai/generate", {
        method: "POST",
      });

      const plan = (res.data as { plan?: GenericPlanRecord })?.plan || (res.data as GenericPlanRecord);
      if (res.success && plan && (plan._id || plan.planName)) {
        setMealPlan(plan);
        toast.success("New AI Meal Plan generated & activated!");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to generate meal plan. Please ensure profile is complete.";
      toast.error(msg);
    } finally {
      setIsGeneratingMeal(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">AI Generated Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gemini custom multi-day workout splits and macro-balanced dietary regimens.
          </p>
        </div>

        {/* Generate Actions */}
        {planType === "workout" ? (
          <Button
            id="generate-workout-plan-btn"
            onClick={handleGenerateWorkoutPlan}
            disabled={isGeneratingWorkout}
            className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-semibold shadow-md shadow-indigo-500/20"
          >
            {isGeneratingWorkout ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Formulating Split...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" />
                Generate New Workout Split
              </>
            )}
          </Button>
        ) : (
          <Button
            id="generate-meal-plan-btn"
            onClick={handleGenerateMealPlan}
            disabled={isGeneratingMeal}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-md shadow-emerald-500/20"
          >
            {isGeneratingMeal ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Calculating Macros...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" />
                Generate New Meal Plan
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs
        value={planType}
        onValueChange={(val) => setPlanType(val as "workout" | "meal")}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="workout" className="flex items-center gap-2">
            <Dumbbell className="size-4 text-indigo-400" />
            AI Workout Plan
          </TabsTrigger>
          <TabsTrigger value="meal" className="flex items-center gap-2">
            <Utensils className="size-4 text-emerald-400" />
            AI Nutrition Plan
          </TabsTrigger>
        </TabsList>

        {/* WORKOUT PLANS TAB */}
        <TabsContent value="workout" className="space-y-6">
          {isLoadingWorkout ? (
            <div className="flex justify-center p-16">
              <Loader2 className="size-8 text-indigo-500 animate-spin" />
            </div>
          ) : !workoutPlan ? (
            <Card className="border-border/60 bg-card/60 backdrop-blur-md text-center p-12 space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                <Dumbbell className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No Active Workout Plan</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click the button below to generate a tailored workout split using your experience level and available equipment.
                </p>
              </div>
              <Button
                onClick={handleGenerateWorkoutPlan}
                disabled={isGeneratingWorkout}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              >
                {isGeneratingWorkout ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Generate Workout Split
                  </>
                )}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Plan Header Card */}
              <Card className="border-border/60 bg-card/75 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl font-bold">{workoutPlan.planName}</CardTitle>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                        Active Plan
                      </span>
                    </div>
                    <CardDescription className="text-xs flex items-center gap-3">
                      <span>{workoutPlan.schedule?.length || workoutPlan.days?.length || 0} Scheduled Days</span>
                      <span>•</span>
                      <span>
                        Generated{" "}
                        {workoutPlan.createdAt
                          ? new Date(workoutPlan.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Recently"}
                      </span>
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>

              {/* Days Grid */}
              {(() => {
                const workoutDays = (workoutPlan.schedule || workoutPlan.days || []).map(
                  (d: GenericPlanDay, idx: number) => ({
                    dayNumber: d.dayNumber ?? idx + 1,
                    dayName: d.dayName ?? d.day ?? `Day ${idx + 1}`,
                    focus: d.focus || "Targeted Training",
                    exercises: d.exercises || [],
                  })
                );
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workoutDays.map((day) => (
                      <Card
                        key={day.dayNumber}
                        className="border-border/60 bg-card/60 backdrop-blur-md hover:border-indigo-500/30 transition-all"
                      >
                        <CardHeader className="pb-3 border-b border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold">
                                {day.dayNumber}
                              </span>
                              {day.dayName}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                              {day.focus}
                            </span>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-3 space-y-2">
                          {day.exercises?.map((ex, exIdx: number) => (
                            <div
                              key={exIdx}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/30 text-xs"
                            >
                              <div className="space-y-0.5">
                                <p className="font-semibold text-foreground">{ex.name}</p>
                                {ex.notes && (
                                  <p className="text-[10px] text-muted-foreground">{ex.notes}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-bold text-indigo-400">
                                  {ex.sets} sets × {ex.reps}
                                </span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>

        {/* MEAL PLANS TAB */}
        <TabsContent value="meal" className="space-y-6">
          {isLoadingMeal ? (
            <div className="flex justify-center p-16">
              <Loader2 className="size-8 text-emerald-500 animate-spin" />
            </div>
          ) : !mealPlan ? (
            <Card className="border-border/60 bg-card/60 backdrop-blur-md text-center p-12 space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Utensils className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No Active Meal Plan</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Generate a structured nutritional plan aligned with your target TDEE and dietary preferences.
                </p>
              </div>
              <Button
                onClick={handleGenerateMealPlan}
                disabled={isGeneratingMeal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {isGeneratingMeal ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Generate Meal Plan
                  </>
                )}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Plan Header Card */}
              <Card className="border-border/60 bg-card/75 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl font-bold">{mealPlan.planName}</CardTitle>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
                        Active Plan
                      </span>
                    </div>
                    <CardDescription className="text-xs flex items-center gap-3">
                      <span>{mealPlan.schedule?.length || mealPlan.days?.length || 0} Days Formulated</span>
                      <span>•</span>
                      <span>
                        Generated{" "}
                        {mealPlan.createdAt
                          ? new Date(mealPlan.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Recently"}
                      </span>
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>

              {/* Days Grid */}
              {(() => {
                const mealDays = (mealPlan.schedule || mealPlan.days || []).map(
                  (d: GenericPlanDay, idx: number) => {
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
                  }
                );

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mealDays.map((day) => (
                      <Card
                        key={day.dayNumber}
                        className="border-border/60 bg-card/60 backdrop-blur-md hover:border-emerald-500/30 transition-all"
                      >
                        <CardHeader className="pb-3 border-b border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                                {day.dayNumber}
                              </span>
                              {day.dayName}
                            </span>
                            {day.totalCalories > 0 && (
                              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                                {day.totalCalories} kcal Total
                              </span>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="pt-3 space-y-2.5">
                          {day.meals?.map((meal, mealIdx: number) => {
                            // Check if this meal entry has nested items (grouped by mealType)
                            if (meal.items && Array.isArray(meal.items) && meal.items.length > 0) {
                              return (
                                <div key={mealIdx} className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                    {meal.mealType || `Meal ${mealIdx + 1}`}
                                  </span>
                                  <div className="space-y-1.5">
                                    {meal.items.map((item, itemIdx: number) => (
                                      <div
                                        key={itemIdx}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/30 text-xs gap-1"
                                      >
                                        <div className="space-y-0.5">
                                          <p className="font-semibold text-foreground">{item.name}</p>
                                          {item.servingSize && (
                                            <p className="text-[10px] text-muted-foreground">{item.servingSize}</p>
                                          )}
                                        </div>
                                        <div className="sm:text-right shrink-0">
                                          <span className="text-xs font-bold text-emerald-400 block">
                                            {item.calories ?? 0} kcal
                                          </span>
                                          {(item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                                            <span className="text-[10px] text-muted-foreground">
                                              P:{item.protein ?? 0}g • C:{item.carbs ?? 0}g • F:{item.fat ?? 0}g
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            // Otherwise, this meal entry is a direct food item (standard AI MealPlan output)
                            return (
                              <div
                                key={mealIdx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/30 text-xs gap-1 hover:border-emerald-500/20 transition-colors"
                              >
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-foreground">{meal.name || `Meal Item ${mealIdx + 1}`}</p>
                                  {meal.servingSize && (
                                    <p className="text-[10px] text-muted-foreground">{meal.servingSize}</p>
                                  )}
                                </div>
                                <div className="sm:text-right shrink-0">
                                  <span className="text-xs font-bold text-emerald-400 block">
                                    {meal.calories ?? 0} kcal
                                  </span>
                                  {(meal.protein !== undefined || meal.carbs !== undefined || meal.fat !== undefined) && (
                                    <span className="text-[10px] text-muted-foreground">
                                      P:{meal.protein ?? 0}g • C:{meal.carbs ?? 0}g • F:{meal.fat ?? 0}g
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl p-8">
          <div className="w-full h-96 rounded-xl bg-card/50 animate-pulse" />
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  );
}
