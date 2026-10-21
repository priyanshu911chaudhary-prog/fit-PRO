"use client";

import React from "react";
import { Zap, Utensils } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { MealTypeEnum } from "@/constants";
import { MEAL_ICONS } from "../lib/constants";
import { cn } from "cn";

interface MealParametersCardProps {
  date: string;
  onDateChange: (date: string) => void;
  mealType: string;
  onMealTypeChange: (mealType: string) => void;
}

export function MealParametersCard({
  date,
  onDateChange,
  mealType,
  onMealTypeChange,
}: MealParametersCardProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
          <Zap className="size-4 text-cyan-400" />
          Meal Parameters
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Session timing and designated meal window
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-xs font-medium text-muted-foreground">
            Meal Date
          </Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Designated Window
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(MealTypeEnum).map((type) => {
              const IconComp = MEAL_ICONS[type] || Utensils;
              const isSelected = mealType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onMealTypeChange(type)}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs capitalize transition-all cursor-pointer font-medium",
                    isSelected
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-semibold shadow-xs"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <IconComp
                    className={cn(
                      "size-4",
                      isSelected ? "text-cyan-400" : "text-muted-foreground"
                    )}
                  />
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
