"use client";

import React from "react";
import { Search, Plus, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FoodItem, CategoryFilterId } from "../types";
import { CATEGORY_FILTERS } from "../lib/constants";
import { cn } from "cn";

interface FoodCatalogPickerProps {
  filteredCatalog: FoodItem[];
  isLoadingCatalog?: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categoryFilter: CategoryFilterId;
  onCategoryFilterChange: (cat: CategoryFilterId) => void;
  onAddFood: (food: FoodItem) => void;
}

export function FoodCatalogPicker({
  filteredCatalog,
  isLoadingCatalog,
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  onAddFood,
}: FoodCatalogPickerProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Search className="size-4 text-emerald-400" />
            Ingredient & Food Catalog
          </CardTitle>
          <div className="flex items-center gap-2">
            {isLoadingCatalog ? (
              <Loader2 className="size-3 text-cyan-400 animate-spin" />
            ) : null}
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-border/80 text-muted-foreground"
            >
              {filteredCatalog.length} available
            </Badge>
          </div>
        </div>

        <div className="pt-2 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              id="food-search-input"
              placeholder="Search tomato, egg, rice, paneer, chicken..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 text-xs h-9 bg-background/50 border-border/70 text-foreground"
            />
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-none">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryFilterChange(cat.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md border shrink-0 transition-all cursor-pointer font-medium",
                  categoryFilter === cat.id
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold shadow-xs"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
          {filteredCatalog.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Sparkles className="size-6 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground">No ingredients match your query</p>
              <p className="text-[11px] text-muted-foreground">
                Try searching for common staples like &quot;rice&quot;, &quot;egg&quot;, &quot;milk&quot;, or &quot;dal&quot;.
              </p>
            </div>
          ) : (
            filteredCatalog.map((food) => {
              const basisLabel = (() => {
                if (food.servingBasis === "per_100g") return "per 100g";
                if (food.servingBasis === "per_100ml") return "per 100ml";
                if (food.servingBasis === "per_piece") {
                  return food.pieceWeightG ? `per piece (${food.pieceWeightG}g)` : "per piece";
                }
                if (food.servingBasis === "per_slice") {
                  const weight = food.pieceWeightG || food.servingWeightG;
                  return weight ? `per slice (${weight}g)` : "per slice";
                }
                if (food.servingWeightG) {
                  return `per serving (${food.servingWeightG}g)`;
                }
                if (food.servingUnit && food.servingUnit !== "serving") {
                  return `per ${food.servingUnit}`;
                }
                return "per serving";
              })();

              return (
                <div
                  key={food._id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/30 hover:border-emerald-500/30 transition-all group"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-400 transition-colors">
                        {food.name}
                      </p>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-muted/40 text-muted-foreground/80 border border-border/50 shrink-0">
                        {basisLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <span className="text-foreground font-bold">{food.calories} kcal</span>
                      <span>•</span>
                      <span className="text-cyan-400">P:{food.protein}g</span>
                      <span className="text-amber-400">C:{food.carbs}g</span>
                      <span className="text-purple-400">F:{food.fat}g</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onAddFood(food)}
                    className="h-7 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer shrink-0"
                    aria-label={`Add ${food.name} to plate`}
                  >
                    <Plus className="size-3 mr-1" />
                    Add
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
