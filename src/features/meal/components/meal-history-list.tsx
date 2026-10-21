"use client";

import React from "react";
import { History, Utensils, Calendar, Trash2, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealLogRecord } from "../types";
import { formatSafeDate } from "../lib/calculations";

interface MealHistoryListProps {
  history: MealLogRecord[];
  isLoadingHistory: boolean;
  selectedDate: string;
  onNavigateToLog: () => void;
  onDeleteLog: (id: string) => void;
}

export function MealHistoryList({
  history,
  isLoadingHistory,
  selectedDate,
  onNavigateToLog,
  onDeleteLog,
}: MealHistoryListProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <History className="size-4 text-cyan-400" />
            Logged Meals for {selectedDate}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Complete record of all meals, ingredients, and nutrients committed on this day
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className="text-xs font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
        >
          {history.length} Meals Logged
        </Badge>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <Loader2 className="size-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono text-muted-foreground">
              Retrieving nutrition ledger...
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-14 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
              <Utensils className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">No meals logged for {selectedDate}</p>
              <p className="text-[11px] text-muted-foreground">
                Switch to &quot;Log Meal&quot; to compose and record your first meal for this date.
              </p>
            </div>
            <Button
              size="sm"
              onClick={onNavigateToLog}
              className="bg-primary text-primary-foreground font-semibold text-xs h-8 px-3 cursor-pointer"
            >
              <Plus className="size-3.5 mr-1" />
              Log Meal for {selectedDate}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => (
              <div
                key={record._id}
                className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card/40 hover:border-cyan-500/40 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <Utensils className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-foreground capitalize">
                          {record.title || record.mealType || "Meal"}
                        </h4>
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-400">
                          {record.totalCalories} kcal
                        </span>
                        {record.totalProtein !== undefined && (
                          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                            <span>•</span>
                            <span className="text-cyan-400 font-semibold">P: {record.totalProtein}g</span>
                            <span className="text-amber-400 font-semibold">C: {record.totalCarbs}g</span>
                            <span className="text-purple-400 font-semibold">F: {record.totalFat}g</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 font-mono">
                        <Calendar className="size-3 text-cyan-400" />
                        {record.consumedDate || formatSafeDate(record.createdAt || record.date)}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteLog(record._id)}
                    className="size-8 text-muted-foreground hover:text-rose-400 self-end sm:self-center transition-colors cursor-pointer"
                    aria-label={`Delete ${record.title || "meal"}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                {/* Food items breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {(record.meals || record.items || []).map((item, itemIdx) => {
                    const foodName =
                      item.name ||
                      (typeof item.foodItemId === "object" && item.foodItemId !== null
                        ? (item.foodItemId as { name?: string }).name
                        : typeof item.foodItem === "object" && item.foodItem !== null
                          ? (item.foodItem as { name?: string }).name
                          : "Food Item");

                    const caloriesVal =
                      item.calories ??
                      (typeof item.foodItemId === "object" && item.foodItemId !== null
                        ? (item.foodItemId as { calories?: number }).calories
                        : 0) ??
                      0;

                    const serving =
                      item.servingSize ||
                      (item.quantity ? `${item.quantity} ${item.unit || "serving(s)"}` : "1 serving");

                    const proteinVal = item.protein;
                    const carbsVal = item.carbs;
                    const fatVal = item.fat;

                    return (
                      <div
                        key={itemIdx}
                        className="p-3 rounded-lg bg-background/50 border border-border/40 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground truncate pr-1">{foodName}</p>
                          <span className="text-emerald-400 font-mono font-bold shrink-0">{caloriesVal} kcal</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>{serving}</span>
                          {proteinVal !== undefined ? (
                            <span className="text-[10px]">
                              <span className="text-cyan-400">P:{proteinVal}g</span>{" "}
                              <span className="text-amber-400">C:{carbsVal}g</span>{" "}
                              <span className="text-purple-400">F:{fatVal}g</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
