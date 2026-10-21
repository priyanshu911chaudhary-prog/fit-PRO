"use client";

import React from "react";
import { Apple, Minus, Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddedFoodItem } from "../types";

interface MealPlateBuilderProps {
  addedItems: AddedFoodItem[];
  totalCalories: number;
  isSubmitting: boolean;
  onAdjustQuantity: (foodItemId: string, delta: number) => void;
  onUpdateQuantity: (foodItemId: string, quantity: number) => void;
  onRemoveItem: (foodItemId: string) => void;
}

export function MealPlateBuilder({
  addedItems,
  totalCalories,
  isSubmitting,
  onAdjustQuantity,
  onUpdateQuantity,
  onRemoveItem,
}: MealPlateBuilderProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Apple className="size-4 text-emerald-400" />
            Plate Fuel Breakdown
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Adjust servings, verify portion sizes, and calculate meal energy
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className="text-xs font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
        >
          {addedItems.length} Food Items
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {addedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-14 text-center text-xs text-muted-foreground space-y-3">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center">
              <Apple className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground text-sm">Plate is currently empty</p>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Pick food items from the catalog on the left to compute live protein, carbs, fats,
                and total caloric energy.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {addedItems.map((item) => (
              <div
                key={item.foodItemId}
                className="p-3.5 rounded-xl border border-border/70 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/30 transition-all"
              >
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
                    <span className="font-bold text-foreground">
                      {Math.round(item.calories * item.quantity)} kcal
                    </span>
                    <span>•</span>
                    <span className="text-cyan-400">
                      P: {Math.round(item.protein * item.quantity)}g
                    </span>
                    <span>•</span>
                    <span className="text-amber-400">
                      C: {Math.round(item.carbs * item.quantity)}g
                    </span>
                    <span>•</span>
                    <span className="text-purple-400">
                      F: {Math.round(item.fat * item.quantity)}g
                    </span>
                  </div>
                </div>

                {/* Servings Stepper */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(item.foodItemId, -0.5)}
                      className="size-7 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                      title="-0.5 serving"
                    >
                      <Minus className="size-3" />
                    </button>
                    <Input
                      type="number"
                      min={0.5}
                      max={50}
                      step={0.5}
                      value={item.quantity}
                      onChange={(e) =>
                        onUpdateQuantity(item.foodItemId, Number(e.target.value))
                      }
                      className="w-16 h-7 text-xs font-mono text-center bg-background/60 border-border/70 text-foreground px-1"
                    />
                    <button
                      type="button"
                      onClick={() => onAdjustQuantity(item.foodItemId, 0.5)}
                      className="size-7 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                      title="+0.5 serving"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.foodItemId)}
                    className="size-7 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Remove food"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/40">
              <div className="text-xs font-mono text-muted-foreground">
                Energy Yield:{" "}
                <strong className="text-emerald-400 font-bold">{totalCalories} kcal</strong>{" "}
                across {addedItems.length} items
              </div>

              <Button
                type="submit"
                id="submit-meal-btn"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Committing Fuel Log...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 mr-2" />
                    Commit Meal to Log
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
