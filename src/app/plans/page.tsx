"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Sparkles,
  Dumbbell,
  Utensils,
  Loader2,
  Calendar,
  Layers,
  Flame,
  Activity,
  Zap,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "cn";

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
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Sparkles className="size-3.5" />
                ADAPTIVE PROTOCOL GENERATOR
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                GEMINI HIGH-PRECISION
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Algorithmic Training & Nutrition Splits
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Personalized multi-day periodization splits and macro-balanced dietary fuel regimens.
            </p>
          </div>

          {/* Action Trigger */}
          {planType === "workout" ? (
            <Button
              id="generate-workout-plan-btn"
              onClick={handleGenerateWorkoutPlan}
              disabled={isGeneratingWorkout}
              className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer transition-all self-start md:self-auto"
            >
              {isGeneratingWorkout ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Synthesizing Overload Split...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2 text-emerald-200" />
                  Formulate New Workout Split
                </>
              )}
            </Button>
          ) : (
            <Button
              id="generate-meal-plan-btn"
              onClick={handleGenerateMealPlan}
              disabled={isGeneratingMeal}
              className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer transition-all self-start md:self-auto"
            >
              {isGeneratingMeal ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Calculating Macro Partition...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 mr-2 text-emerald-200" />
                  Formulate New Nutrition Plan
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={planType}
        onValueChange={(val) => setPlanType(val as "workout" | "meal")}
        className="space-y-6"
      >
        <TabsList className="bg-background/60 border border-border/70 p-1 rounded-xl">
          <TabsTrigger
            value="workout"
            className={cn(
              "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all",
              planType === "workout"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Dumbbell className="size-3.5" />
            AI Workout Split
          </TabsTrigger>
          <TabsTrigger
            value="meal"
            className={cn(
              "flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all",
              planType === "meal"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Utensils className="size-3.5" />
            AI Nutrition Protocol
          </TabsTrigger>
        </TabsList>

        {/* WORKOUT PLANS TAB */}
        <TabsContent value="workout" className="space-y-6 mt-0">
          {isLoadingWorkout ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="size-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-mono text-muted-foreground">
                Retrieving active workout split...
              </p>
            </div>
          ) : !workoutPlan ? (
            <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl text-center p-14 space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Dumbbell className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No Active Workout Protocol</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Initialize an algorithmic multi-day training split customized to your experience level and equipment availability.
                </p>
              </div>
              <Button
                onClick={handleGenerateWorkoutPlan}
                disabled={isGeneratingWorkout}
                className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                {isGeneratingWorkout ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Formulating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Formulate Workout Protocol
                  </>
                )}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Plan Header Card */}
              <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-border/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-xl font-bold text-foreground">
                        {workoutPlan.planName}
                      </CardTitle>
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono font-bold">
                        ACTIVE PROTOCOL
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-3 font-mono">
                      <span>{workoutPlan.schedule?.length || workoutPlan.days?.length || 0} Scheduled Days</span>
                      <span>•</span>
                      <span>
                        Formulated{" "}
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

              {/* 3-Day Sequential Grid */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {workoutDays.map((day) => (
                      <Card
                        key={day.dayNumber}
                        className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl hover:border-emerald-500/40 transition-all flex flex-col shadow-lg"
                      >
                        <CardHeader className="pb-3 border-b border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground flex items-center gap-2">
                              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                                0{day.dayNumber}
                              </span>
                              {day.dayName}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground">
                              {day.focus}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-3 space-y-2.5 flex-1">
                          {day.exercises?.map((ex, exIdx: number) => (
                            <div
                              key={exIdx}
                              className="p-3 rounded-xl bg-card/40 border border-border/50 text-xs space-y-1 hover:border-emerald-500/30 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-foreground">{ex.name}</p>
                                <span className="font-mono text-emerald-400 font-bold text-[11px] shrink-0 ml-2">
                                  {ex.sets} sets × {ex.reps}
                                </span>
                              </div>
                              {ex.notes && (
                                <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-sans">
                                  {ex.notes}
                                </p>
                              )}
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
        <TabsContent value="meal" className="space-y-6 mt-0">
          {isLoadingMeal ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-3">
              <Loader2 className="size-8 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-muted-foreground">
                Retrieving active nutrition plan...
              </p>
            </div>
          ) : !mealPlan ? (
            <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl text-center p-14 space-y-4">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Utensils className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">No Active Nutrition Protocol</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Generate a structured dietary regimen balanced against your target TDEE expenditure.
                </p>
              </div>
              <Button
                onClick={handleGenerateMealPlan}
                disabled={isGeneratingMeal}
                className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                {isGeneratingMeal ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Formulate Nutrition Protocol
                  </>
                )}
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Plan Header Card */}
              <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-border/40">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <CardTitle className="text-xl font-bold text-foreground">
                        {mealPlan.planName}
                      </CardTitle>
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10 text-[10px] font-mono font-bold">
                        ACTIVE DIETARY FUEL
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-3 font-mono">
                      <span>{mealPlan.schedule?.length || mealPlan.days?.length || 0} Feeding Days</span>
                      <span>•</span>
                      <span>
                        Formulated{" "}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {mealDays.map((day) => (
                      <Card
                        key={day.dayNumber}
                        className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl hover:border-cyan-500/40 transition-all flex flex-col shadow-lg"
                      >
                        <CardHeader className="pb-3 border-b border-border/40">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-foreground flex items-center gap-2">
                              <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
                                0{day.dayNumber}
                              </span>
                              {day.dayName}
                            </span>
                            {day.totalCalories > 0 && (
                              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono font-bold">
                                {day.totalCalories} kcal Total
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="pt-3 space-y-3 flex-1">
                          {day.meals?.map((meal, mealIdx: number) => {
                            if (meal.items && Array.isArray(meal.items) && meal.items.length > 0) {
                              return (
                                <div key={mealIdx} className="space-y-1.5">
                                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">
                                    {meal.mealType || `Feeding Window ${mealIdx + 1}`}
                                  </span>
                                  <div className="space-y-1.5">
                                    {meal.items.map((item, itemIdx: number) => (
                                      <div
                                        key={itemIdx}
                                        className="p-3 rounded-xl bg-card/40 border border-border/50 text-xs space-y-1 hover:border-cyan-500/30 transition-all"
                                      >
                                        <div className="flex items-center justify-between">
                                          <p className="font-semibold text-foreground">{item.name}</p>
                                          <span className="text-xs font-mono font-bold text-cyan-400">
                                            {item.calories ?? 0} kcal
                                          </span>
                                        </div>
                                        {item.servingSize && (
                                          <p className="text-[10px] text-muted-foreground">{item.servingSize}</p>
                                        )}
                                        {(item.protein !== undefined || item.carbs !== undefined || item.fat !== undefined) && (
                                          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-0.5">
                                            <span className="text-cyan-400">P:{item.protein ?? 0}g</span>
                                            <span>•</span>
                                            <span className="text-amber-400">C:{item.carbs ?? 0}g</span>
                                            <span>•</span>
                                            <span className="text-purple-400">F:{item.fat ?? 0}g</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={mealIdx}
                                className="p-3 rounded-xl bg-card/40 border border-border/50 text-xs space-y-1 hover:border-cyan-500/30 transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-foreground">{meal.name || `Fuel Item ${mealIdx + 1}`}</p>
                                  <span className="text-xs font-mono font-bold text-cyan-400">
                                    {meal.calories ?? 0} kcal
                                  </span>
                                </div>
                                {meal.servingSize && (
                                  <p className="text-[10px] text-muted-foreground">{meal.servingSize}</p>
                                )}
                                {(meal.protein !== undefined || meal.carbs !== undefined || meal.fat !== undefined) && (
                                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-0.5">
                                    <span className="text-cyan-400">P:{meal.protein ?? 0}g</span>
                                    <span>•</span>
                                    <span className="text-amber-400">C:{meal.carbs ?? 0}g</span>
                                    <span>•</span>
                                    <span className="text-purple-400">F:{meal.fat ?? 0}g</span>
                                  </div>
                                )}
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
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <PlansContent />
    </Suspense>
  );
}
