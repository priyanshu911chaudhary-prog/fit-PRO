"use client";

import React from "react";
import Link from "next/link";
import { Dumbbell, Utensils, ArrowRight, CheckCircle2, Clock, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DashboardStats } from "../types";
import { formatSafeDate } from "../lib/dashboard-helpers";
import { cn } from "cn";

interface RecentActivityLedgersProps {
  recentWorkouts?: DashboardStats["recentWorkouts"];
  recentMeals?: DashboardStats["recentMeals"];
}

export function RecentActivityLedgers({
  recentWorkouts = [],
  recentMeals = [],
}: RecentActivityLedgersProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Recent Workouts */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Dumbbell className="size-4 text-emerald-400" />
              Training Session Ledger
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Verified athletic workouts & volume load
            </CardDescription>
          </div>
          <Link
            href="/workout"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2"
            )}
          >
            View All
            <ArrowRight className="size-3.5 ml-1" />
          </Link>
        </CardHeader>

        <CardContent className="pt-3">
          {recentWorkouts && recentWorkouts.length > 0 ? (
            <div className="divide-y divide-border/40">
              {recentWorkouts.map((wk) => (
                <div
                  key={wk._id}
                  className="py-3 flex items-center justify-between group hover:bg-muted/10 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                        {wk.workoutType}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{wk.exercisesCount} exercises</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {wk.duration} mins
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono border-border/80 text-muted-foreground"
                  >
                    {formatSafeDate(wk.date)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground space-y-3">
              <div className="size-10 rounded-xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
                <Dumbbell className="size-5 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">No workouts recorded this cycle</p>
                <p className="text-[11px] text-muted-foreground">
                  Log your exercises to trigger progression telemetry.
                </p>
              </div>
              <Link
                href="/workout"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-primary text-primary-foreground font-semibold text-xs h-8 px-3"
                )}
              >
                <Plus className="size-3.5 mr-1" />
                Start Workout
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right Column: Recent Meals */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Utensils className="size-4 text-cyan-400" />
              Nutrition & Fuel Ledger
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Macronutrient intake and caloric burn balance
            </CardDescription>
          </div>
          <Link
            href="/meal"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2"
            )}
          >
            View All
            <ArrowRight className="size-3.5 ml-1" />
          </Link>
        </CardHeader>

        <CardContent className="pt-3">
          {recentMeals && recentMeals.length > 0 ? (
            <div className="divide-y divide-border/40">
              {recentMeals.map((meal) => (
                <div
                  key={meal._id}
                  className="py-3 flex items-center justify-between group hover:bg-muted/10 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Utensils className="size-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                        {meal.mealType}
                      </div>
                      <div className="text-[11px] font-mono text-cyan-400/90 mt-0.5">
                        {meal.totalCalories} kcal logged
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[11px] font-mono border-border/80 text-muted-foreground"
                  >
                    {formatSafeDate(meal.date)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground space-y-3">
              <div className="size-10 rounded-xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
                <Utensils className="size-5 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">No nutrition logged today</p>
                <p className="text-[11px] text-muted-foreground">
                  Record your meals to balance against your active TDEE budget.
                </p>
              </div>
              <Link
                href="/meal"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-primary text-primary-foreground font-semibold text-xs h-8 px-3"
                )}
              >
                <Plus className="size-3.5 mr-1" />
                Log Meal & Macros
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
