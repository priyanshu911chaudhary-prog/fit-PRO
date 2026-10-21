import React from "react";
import { Activity, Flame, Layers, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface WorkoutTelemetryHudProps {
  totalVolumeTonnage: number;
  exercisesCount: number;
  totalSetsCount: number;
  estimatedCaloriesBurn: number;
}

export function WorkoutTelemetryHud({
  totalVolumeTonnage,
  exercisesCount,
  totalSetsCount,
  estimatedCaloriesBurn,
}: WorkoutTelemetryHudProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-emerald-400" />
            Volume Tonnage
          </span>
          <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400">
            LIVE
          </Badge>
        </div>
        <div className="text-2xl font-extrabold font-mono text-foreground">
          {totalVolumeTonnage.toLocaleString()}{" "}
          <span className="text-xs font-sans text-muted-foreground font-normal">kg</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">Cumulative sets × reps load</p>
      </Card>

      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Layers className="size-3.5 text-cyan-400" />
            Planned Exercises
          </span>
          <span className="text-[10px] font-mono text-cyan-400">STAGED</span>
        </div>
        <div className="text-2xl font-extrabold font-mono text-foreground">
          {exercisesCount}{" "}
          <span className="text-xs font-sans text-muted-foreground font-normal">movements</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">Compound & isolated picks</p>
      </Card>

      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Activity className="size-3.5 text-amber-400" />
            Total Sets
          </span>
          <span className="text-[10px] font-mono text-amber-400">OUTPUT</span>
        </div>
        <div className="text-2xl font-extrabold font-mono text-foreground">
          {totalSetsCount}{" "}
          <span className="text-xs font-sans text-muted-foreground font-normal">sets</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">Working stimulus brackets</p>
      </Card>

      <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Flame className="size-3.5 text-purple-400" />
            Estimated Burn
          </span>
          <span className="text-[10px] font-mono text-purple-400">EXPENDITURE</span>
        </div>
        <div className="text-2xl font-extrabold font-mono text-foreground">
          ~{estimatedCaloriesBurn}{" "}
          <span className="text-xs font-sans text-muted-foreground font-normal">kcal</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80">Metabolic caloric expenditure</p>
      </Card>
    </div>
  );
}
