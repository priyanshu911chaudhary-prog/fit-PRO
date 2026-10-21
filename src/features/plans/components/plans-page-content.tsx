"use client";

import React from "react";
import { Dumbbell, Utensils } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";
import { usePlans } from "../hooks/use-plans";
import { PlansHeader } from "./plans-header";
import { WorkoutPlanView } from "./workout-plan-view";
import { MealPlanView } from "./meal-plan-view";

export function PlansPageContent() {
  const {
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
  } = usePlans();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <PlansHeader
        planType={planType}
        isGeneratingWorkout={isGeneratingWorkout}
        isGeneratingMeal={isGeneratingMeal}
        onGenerateWorkout={handleGenerateWorkoutPlan}
        onGenerateMeal={handleGenerateMealPlan}
      />

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
          <WorkoutPlanView
            workoutPlan={workoutPlan}
            isLoadingWorkout={isLoadingWorkout}
            isGeneratingWorkout={isGeneratingWorkout}
            onGenerateWorkout={handleGenerateWorkoutPlan}
          />
        </TabsContent>

        {/* MEAL PLANS TAB */}
        <TabsContent value="meal" className="space-y-6 mt-0">
          <MealPlanView
            mealPlan={mealPlan}
            isLoadingMeal={isLoadingMeal}
            isGeneratingMeal={isGeneratingMeal}
            onGenerateMeal={handleGenerateMealPlan}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
