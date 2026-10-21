"use client";

import React from "react";
import { Scale, Flame, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileMetrics } from "../types";

interface ProfileTelemetryStripProps {
  metrics?: ProfileMetrics | null;
}

export function ProfileTelemetryStrip({ metrics }: ProfileTelemetryStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Metric 1: Derived BMI */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg relative overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Scale className="size-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-mono text-muted-foreground">Anthropometric BMI</p>
            <p className="text-3xl font-extrabold font-mono text-foreground">
              {metrics?.bmi ?? "—"}
            </p>
            <Badge
              variant="outline"
              className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono font-bold capitalize"
            >
              {metrics?.bmiCategory ? `${metrics.bmiCategory} category` : "Calibrated"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Metric 2: Basal BMR */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg relative overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Flame className="size-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-mono text-muted-foreground">Basal BMR Floor</p>
            <p className="text-3xl font-extrabold font-mono text-foreground">
              {metrics?.bmr ?? "—"}{" "}
              {metrics?.bmr ? (
                <span className="text-xs font-normal font-sans text-muted-foreground">
                  kcal/d
                </span>
              ) : null}
            </p>
            <p className="text-[11px] text-amber-400 font-mono">Resting Metabolic Baseline</p>
          </div>
        </CardContent>
      </Card>

      {/* Metric 3: Active TDEE */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg relative overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Activity className="size-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-mono text-muted-foreground">Active TDEE Target</p>
            <p className="text-3xl font-extrabold font-mono text-foreground">
              {metrics?.tdee ?? "—"}{" "}
              {metrics?.tdee ? (
                <span className="text-xs font-normal font-sans text-muted-foreground">
                  kcal/d
                </span>
              ) : null}
            </p>
            <p className="text-[11px] text-cyan-400 font-mono">Maintenance Caloric Budget</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
