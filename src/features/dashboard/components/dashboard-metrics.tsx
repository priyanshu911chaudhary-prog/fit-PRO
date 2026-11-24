"use client";

import React from "react";
import { Droplet, Scale, Flame, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DashboardStats } from "../types";

interface DashboardMetricsProps {
  water?: DashboardStats["waterToday"];
  metrics?: DashboardStats["metrics"];
  addingWater: boolean;
  onQuickAddWater: (ml: number) => void;
  onNavigate: (path: string) => void;
}

export function DashboardMetrics({
  water,
  metrics,
  addingWater,
  onQuickAddWater,
  onNavigate,
}: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Hydration */}
      <MetricCard
        title="Daily Hydration"
        value={water?.totalMl || 0}
        unit={`/ ${water?.targetMl || 2500} ml`}
        percentage={water?.percentage || 0}
        statusText={`${water?.percentage || 0}% TARGET`}
        statusVariant="secondary"
        accent="cyan"
        subtext="Water logged today"
        icon={<Droplet className="size-4 text-cyan-700 dark:text-cyan-400" />}
        actionLabel={addingWater ? "..." : "+250ml"}
        onAction={() => onQuickAddWater(250)}
      />

      {/* Metric 2: Current BMI */}
      <MetricCard
        title="Body Mass Index"
        value={metrics?.bmi || "--"}
        unit={metrics?.weight ? `(${metrics.weight} kg)` : ""}
        statusText={metrics?.category ? metrics.category.toUpperCase() : "—"}
        statusVariant="default"
        accent="emerald"
        subtext={`Height: ${metrics?.height || "--"} cm • Weight: ${metrics?.weight || "--"} kg`}
        icon={<Scale className="size-4 text-emerald-700 dark:text-emerald-400" />}
        actionLabel="Log Weigh-In"
        onAction={() => onNavigate("/bmi")}
      />

      {/* Metric 3: Resting BMR */}
      <MetricCard
        title="Basal Metabolic Rate"
        value={metrics?.bmr || "--"}
        unit="kcal / day"
        statusText="Resting"
        statusVariant="outline"
        accent="amber"
        subtext="Estimated energy used at rest"
        icon={<Flame className="size-4 text-amber-700 dark:text-amber-400" />}
        actionLabel="Edit profile"
        onAction={() => onNavigate("/profile")}
      />

      {/* Metric 4: Maintenance TDEE */}
      <MetricCard
        title="Daily energy expenditure"
        value={metrics?.tdee || "--"}
        unit="kcal / day"
        statusText="Active"
        statusVariant="outline"
        accent="purple"
        subtext="Estimated energy including activity"
        icon={<TrendingUp className="size-4 text-purple-700 dark:text-purple-400" />}
        actionLabel="Log meal"
        onAction={() => onNavigate("/meal")}
      />
    </div>
  );
}
