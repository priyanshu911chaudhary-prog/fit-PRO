import React from "react";
import { CheckCircle2, Loader2, Minus, Plus, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

interface BmiMeasurementFormProps {
  height: number;
  onHeightChange: (height: number) => void;
  weight: number;
  onWeightChange: (weight: number) => void;
  liveBMI: { bmi: number; category: string };
  estBmr: number;
  spectrumPct: number;
  categoryColor: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function BmiMeasurementForm({
  height,
  onHeightChange,
  weight,
  onWeightChange,
  liveBMI,
  estBmr,
  spectrumPct,
  categoryColor,
  isSubmitting,
  onSubmit,
}: BmiMeasurementFormProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="pb-3 border-b border-border/40">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
          <Scale className="size-4 text-emerald-400" />
          Log Body Measurement
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Enter current stature & mass to re-index your metabolic baseline
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Height Input with Steppers */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label htmlFor="height" className="text-muted-foreground font-medium">
                Standing Height (cm)
              </Label>
              <span className="font-mono text-emerald-400 font-bold">{height} cm</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onHeightChange(Math.max(50, height - 1))}
                className="size-9 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-sm"
              >
                <Minus className="size-3.5" />
              </button>
              <Input
                id="height"
                type="number"
                min={50}
                max={250}
                value={height}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                className="bg-background/50 border-border/70 text-foreground font-mono text-center text-sm h-9"
                required
              />
              <button
                type="button"
                onClick={() => onHeightChange(Math.min(250, height + 1))}
                className="size-9 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-sm"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Weight Input with Steppers */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <Label htmlFor="weight" className="text-muted-foreground font-medium">
                Body Weight (kg)
              </Label>
              <span className="font-mono text-emerald-400 font-bold">{weight} kg</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onWeightChange(Math.max(20, Number((weight - 0.5).toFixed(1))))}
                className="h-9 px-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs font-mono"
              >
                -0.5
              </button>
              <Input
                id="weight"
                type="number"
                min={20}
                max={300}
                step="0.1"
                value={weight}
                onChange={(e) => onWeightChange(Number(e.target.value))}
                className="bg-background/50 border-border/70 text-foreground font-mono text-center text-sm h-9"
                required
              />
              <button
                type="button"
                onClick={() => onWeightChange(Math.min(300, Number((weight + 0.5).toFixed(1))))}
                className="h-9 px-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs font-mono"
              >
                +0.5
              </button>
            </div>
          </div>

          {/* Live Computed Dial HUD */}
          <div className="rounded-xl border border-border/70 bg-card/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">
                Live Computed Score
              </span>
              <Badge variant="outline" className={cn("text-[10px] font-mono font-bold capitalize px-2 py-0.5", categoryColor)}>
                {liveBMI.category}
              </Badge>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-4xl font-extrabold font-mono tracking-tight text-foreground">
                {liveBMI.bmi}
                <span className="text-xs font-sans font-normal text-muted-foreground ml-1.5">
                  BMI score
                </span>
              </div>
              <div className="text-right text-[11px] font-mono text-muted-foreground">
                BMR: <strong className="text-foreground">{estBmr} kcal</strong>
              </div>
            </div>

            {/* WHO Classification Spectrum Gauge */}
            <div className="space-y-1.5 pt-1">
              <div className="relative h-2 w-full rounded-full bg-muted/40 overflow-hidden flex">
                <div className="w-[17.5%] bg-cyan-400 h-full" title="Underweight (<18.5)" />
                <div className="w-[32%] bg-emerald-400 h-full" title="Normal (18.5-24.9)" />
                <div className="w-[25%] bg-amber-400 h-full" title="Overweight (25-29.9)" />
                <div className="w-[25.5%] bg-rose-400 h-full" title="Obese (30+)" />
              </div>

              {/* Indicator Cursor */}
              <div className="relative h-2 w-full">
                <div
                  style={{ left: `${spectrumPct}%` }}
                  className="absolute -top-1 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
                >
                  <div className="size-2 rounded-full bg-foreground shadow-sm ring-2 ring-emerald-500" />
                </div>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-0.5">
                <span className="text-cyan-400">&lt;18.5</span>
                <span className="text-emerald-400 font-bold">18.5 – 24.9</span>
                <span className="text-amber-400">25.0 – 29.9</span>
                <span className="text-rose-400">30.0+</span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground font-semibold text-xs h-10 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Calibrating & Recording...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Commit Anthropometric Log
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
