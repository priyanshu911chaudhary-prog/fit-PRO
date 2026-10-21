import React from "react";
import { Loader2, Sparkles, Utensils } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GenericPlanRecord } from "../types";
import { normalizeMealDays } from "../lib/plan-helpers";

interface MealPlanViewProps {
  mealPlan: GenericPlanRecord | null;
  isLoadingMeal: boolean;
  isGeneratingMeal: boolean;
  onGenerateMeal: () => void;
}

export function MealPlanView({
  mealPlan,
  isLoadingMeal,
  isGeneratingMeal,
  onGenerateMeal,
}: MealPlanViewProps) {
  if (isLoadingMeal) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <Loader2 className="size-8 text-cyan-400 animate-spin" />
        <p className="text-xs font-mono text-muted-foreground">
          Retrieving active nutrition plan...
        </p>
      </div>
    );
  }

  if (!mealPlan) {
    return (
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
          onClick={onGenerateMeal}
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
    );
  }

  const mealDays = normalizeMealDays(mealPlan);

  return (
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
              <span>{mealDays.length} Feeding Days</span>
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
    </div>
  );
}
