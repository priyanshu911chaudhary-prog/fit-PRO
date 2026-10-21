import React from "react";
import { Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { MUSCLE_GROUPS } from "../lib/constants";
import type { ExerciseItem } from "../types";

interface ExerciseMovementCatalogProps {
  filteredCatalog: ExerciseItem[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedMuscle: string;
  onSelectedMuscleChange: (muscle: string) => void;
  onAddExercise: (exercise: ExerciseItem) => void;
}

export function ExerciseMovementCatalog({
  filteredCatalog,
  searchQuery,
  onSearchQueryChange,
  selectedMuscle,
  onSelectedMuscleChange,
  onAddExercise,
}: ExerciseMovementCatalogProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Search className="size-4 text-cyan-400" />
            Movement Catalog
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground">
            {filteredCatalog.length} available
          </Badge>
        </div>

        {/* Search & Muscle Group Chips */}
        <div className="pt-2 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search bench press, squat, curl..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-8 text-xs h-8 bg-background/50 border-border/70 text-foreground"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {MUSCLE_GROUPS.map((mg) => (
              <button
                key={mg.id}
                type="button"
                onClick={() => onSelectedMuscleChange(mg.id)}
                className={cn(
                  "px-2.5 py-1 rounded-md border shrink-0 transition-all cursor-pointer font-medium",
                  selectedMuscle === mg.id
                    ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-bold shadow-xs"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                {mg.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {filteredCatalog.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No movements found matching query.
            </div>
          ) : (
            filteredCatalog.map((exercise) => (
              <div
                key={exercise._id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/30 transition-all group"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-emerald-400 transition-colors">
                    {exercise.name}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground capitalize">
                    <span className="text-emerald-400 font-mono">
                      {exercise.targetMuscle.replace(/_/g, " ")}
                    </span>
                    <span>•</span>
                    <span>{exercise.equipment}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onAddExercise(exercise)}
                  className="h-7 px-2.5 text-xs font-medium border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer shrink-0"
                  aria-label={`Add ${exercise.name} to workout`}
                >
                  <Plus className="size-3 mr-1" />
                  Add
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
