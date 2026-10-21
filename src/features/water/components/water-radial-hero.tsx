import React from "react";
import { Award, Droplet, Plus, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";
import { VESSELS } from "../lib/constants";
import type { HydrationStats } from "../lib/calculations";

interface WaterRadialHeroProps {
  stats: HydrationStats;
  isSubmitting: boolean;
  hasLogs: boolean;
  customAmount: number;
  onCustomAmountChange: (amount: number) => void;
  onAddWater: (amount: number) => void;
  onUndoLast: () => void;
}

export function WaterRadialHero({
  stats,
  isSubmitting,
  hasLogs,
  customAmount,
  onCustomAmountChange,
  onAddWater,
  onUndoLast,
}: WaterRadialHeroProps) {
  const { total, target, percentage, remaining, glasses, circumference, strokeDashoffset } = stats;

  return (
    <Card className="border-border/70 bg-[#0B0F0E]/85 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
      {/* Ambient Cyan Glow Orbs */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 size-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <CardContent className="p-6 sm:p-10 flex flex-col items-center justify-center text-center space-y-8 relative z-10">
        {/* Circular SVG Telemetry Ring */}
        <div className="relative flex items-center justify-center">
          <div className="size-52 sm:size-64 relative flex items-center justify-center">
            <svg className="size-full -rotate-90 drop-shadow-[0_0_15px_rgba(6,182,212,0.15)]" viewBox="0 0 100 100">
              {/* Track circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-muted/30"
                strokeWidth="7"
                fill="none"
              />
              {/* Active progress circle */}
              <circle
                cx="50"
                cy="50"
                r="42"
                className="stroke-cyan-400 transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Inner Telemetry Core */}
            <div className="absolute flex flex-col items-center justify-center space-y-1">
              <div className="relative">
                <Droplet className="size-8 text-cyan-400 animate-pulse fill-cyan-400/20" />
                {percentage >= 100 && (
                  <span className="absolute -top-1 -right-2 text-xs">🏆</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight font-mono text-foreground">
                  {total}
                </span>
                <span className="text-xs font-mono font-medium text-muted-foreground">
                  ml
                </span>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                Target: <strong className="text-foreground">{target} ml</strong>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] font-mono font-bold mt-1 px-2.5 py-0.5",
                  percentage >= 100
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : "border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
                )}
              >
                {percentage}% COMPLETED
              </Badge>
            </div>
          </div>
        </div>

        {/* Status Subtitle */}
        <div className="space-y-1 max-w-md">
          <h3 className="text-lg font-bold text-foreground">
            {percentage >= 100 ? (
              <span className="flex items-center justify-center gap-1.5 text-emerald-400">
                <Award className="size-5" />
                Hydration Target Succeeded!
              </span>
            ) : (
              `${glasses} Glasses Consumed Today`
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            {percentage >= 100
              ? "Optimal cellular hydration threshold maintained for cognitive and physical performance."
              : `Drink ${remaining.toLocaleString()} ml more to reach your calibrated daily baseline.`}
          </p>
        </div>

        {/* 4 Tactile Vessel Quick-Pill Dock */}
        <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VESSELS.map((v) => {
            const IconComp = v.icon;
            return (
              <button
                key={v.amount}
                type="button"
                disabled={isSubmitting}
                onClick={() => onAddWater(v.amount)}
                className="group relative overflow-hidden rounded-xl border border-cyan-500/30 bg-card/40 p-3.5 flex flex-col items-center justify-center space-y-1.5 hover:border-cyan-500/60 hover:bg-cyan-500/10 transition-all duration-200 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
              >
                <div className="size-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <IconComp className="size-4" />
                </div>
                <span className="text-sm font-bold font-mono text-cyan-400 group-hover:text-cyan-300">
                  +{v.amount} ml
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {v.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Add Row & Undo */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm w-full pt-2">
          <div className="relative flex-1 min-w-[130px]">
            <Input
              type="number"
              min={50}
              max={3000}
              step={50}
              value={customAmount}
              onChange={(e) => onCustomAmountChange(Number(e.target.value))}
              placeholder="Amount (ml)"
              className="text-xs font-mono h-9 bg-background/50 border-border/70 text-foreground text-center"
            />
          </div>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => onAddWater(customAmount)}
            size="sm"
            id="water-add-btn"
            className="bg-primary text-primary-foreground font-semibold text-xs h-9 px-4 shrink-0 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="size-3.5 mr-1" />
            Add Custom
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            id="water-undo-btn"
            disabled={isSubmitting || !hasLogs}
            onClick={onUndoLast}
            className="text-xs h-9 px-3 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 shrink-0 cursor-pointer"
          >
            <RotateCcw className="size-3.5 mr-1" />
            Undo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
