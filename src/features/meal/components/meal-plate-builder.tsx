"use client";

import React from "react";
import { Utensils, Minus, Plus, Trash2, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddedFoodItem, MacroBreakdown } from "../types";

interface MealPlateBuilderProps {
  addedItems: AddedFoodItem[];
  macros: MacroBreakdown;
  mealType: string;
  isSubmitting: boolean;
  onAdjustQuantity: (foodItemId: string, delta: number) => void;
  onUpdateQuantity: (foodItemId: string, quantity: number) => void;
  onUpdateUnit?: (foodItemId: string, unit: string) => void;
  onRemoveItem: (foodItemId: string) => void;
  onClearPlate: () => void;
  onSubmitMeal: (e: React.FormEvent) => void;
}

export function MealPlateBuilder({
  addedItems,
  macros,
  mealType,
  isSubmitting,
  onAdjustQuantity,
  onUpdateQuantity,
  onRemoveItem,
  onClearPlate,
  onSubmitMeal,
}: MealPlateBuilderProps) {
  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Utensils className="size-4 text-cyan-400" />
            Current Meal Workspace
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Combine individual ingredients, adjust portion sizes, and inspect meal macros
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {addedItems.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearPlate}
              className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              title="Clear draft ingredients"
            >
              <RotateCcw className="size-3 mr-1" />
              Clear Draft
            </Button>
          ) : null}
          <Badge
            variant="outline"
            className="text-xs font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10 uppercase"
          >
            {mealLabel} ({addedItems.length} items)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {addedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center">
              <Utensils className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">Your plate is currently empty</p>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Add ingredients like tomato, eggs, rice, paneer, or cooking oil from the catalog to compose your meal and preview its nutrition.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Added Food Items List */}
            {addedItems.map((item) => {
              const step = item.unit === "piece" || item.unit === "slice" || item.unit === "serving" ? 1 : 10;

              return (
                <div
                  key={item.foodItemId}
                  className="p-3.5 rounded-xl border border-border/70 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/30 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{item.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {item.calories} kcal
                      </span>
                      <span>•</span>
                      <span className="text-cyan-400">P: {item.protein}g</span>
                      <span>•</span>
                      <span className="text-amber-400">C: {item.carbs}g</span>
                      <span>•</span>
                      <span className="text-purple-400">F: {item.fat}g</span>
                    </div>
                  </div>

                  {/* Quantity and unit control */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded-lg border border-border/70">
                      <button
                        type="button"
                        onClick={() => onAdjustQuantity(item.foodItemId, -step)}
                        className="size-7 rounded bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                        title={`Decrease by ${step} ${item.unit}`}
                      >
                        <Minus className="size-3" />
                      </button>
                      <Input
                        type="number"
                        min={0.1}
                        max={5000}
                        step={step}
                        value={item.quantity}
                        onChange={(e) =>
                          onUpdateQuantity(item.foodItemId, Number(e.target.value))
                        }
                        className="w-16 h-7 text-xs font-mono text-center bg-transparent border-0 text-foreground px-1"
                      />
                      <button
                        type="button"
                        onClick={() => onAdjustQuantity(item.foodItemId, step)}
                        className="size-7 rounded bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                        title={`Increase by ${step} ${item.unit}`}
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>

                    <span className="text-xs font-mono text-muted-foreground min-w-[36px]">
                      {item.unit}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(item.foodItemId)}
                      className="size-7 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Dedicated Meal Nutrition Preview Summary */}
            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground font-semibold">
                  {mealLabel} Macro Preview
                </span>
                <span className="font-bold text-foreground">
                  {macros.totalCalories} kcal total
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-1.5 rounded-lg bg-background/50 border border-cyan-500/30">
                  <span className="text-[10px] text-muted-foreground block">Protein</span>
                  <span className="text-cyan-400 font-bold">{macros.totalProtein}g</span>
                  <span className="text-[9px] text-muted-foreground/70 block">({macros.proteinPct}%)</span>
                </div>
                <div className="p-1.5 rounded-lg bg-background/50 border border-amber-500/30">
                  <span className="text-[10px] text-muted-foreground block">Carbs</span>
                  <span className="text-amber-400 font-bold">{macros.totalCarbs}g</span>
                  <span className="text-[9px] text-muted-foreground/70 block">({macros.carbsPct}%)</span>
                </div>
                <div className="p-1.5 rounded-lg bg-background/50 border border-purple-500/30">
                  <span className="text-[10px] text-muted-foreground block">Fats</span>
                  <span className="text-purple-400 font-bold">{macros.totalFat}g</span>
                  <span className="text-[9px] text-muted-foreground/70 block">({macros.fatPct}%)</span>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs font-mono text-muted-foreground">
                Composed: <strong className="text-emerald-400 font-bold">{addedItems.length} ingredients</strong>
              </div>

              <Button
                type="button"
                id="submit-meal-btn"
                onClick={onSubmitMeal}
                disabled={isSubmitting || addedItems.length === 0}
                className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-6 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Recording {mealLabel}...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 mr-2" />
                    Log {mealLabel} ({macros.totalCalories} kcal)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
