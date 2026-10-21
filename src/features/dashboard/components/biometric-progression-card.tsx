"use client";

import React from "react";
import Link from "next/link";
import { Activity, ArrowRight, Scale, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ChartMetric, DashboardStats, MetricDelta, TimeRange } from "../types";
import { formatSafeDate } from "../lib/dashboard-helpers";
import { cn } from "cn";

interface BiometricProgressionCardProps {
  filteredChartData: DashboardStats["weightHistory"];
  chartMetric: ChartMetric;
  onChartMetricChange: (metric: ChartMetric) => void;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  metricDelta: MetricDelta | null;
}

export function BiometricProgressionCard({
  filteredChartData,
  chartMetric,
  onChartMetricChange,
  timeRange,
  onTimeRangeChange,
  metricDelta,
}: BiometricProgressionCardProps) {
  return (
    <Card className="lg:col-span-8 border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg relative overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-emerald-400" />
              Biometric Progression Curve
            </CardTitle>
            {metricDelta && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-mono px-2 py-0.5",
                  metricDelta.isPositive
                    ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                    : metricDelta.isZero
                      ? "border-muted-foreground/30 text-muted-foreground"
                      : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                )}
              >
                {metricDelta.isPositive ? `+${metricDelta.diff}` : metricDelta.diff}{" "}
                {metricDelta.unit}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {chartMetric === "weight"
              ? "Historical weight trend curve with variance baselines"
              : "Body Mass Index trajectory calibrated against WHO thresholds"}
          </CardDescription>
        </div>

        {/* Chart Control Suite */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Switcher */}
          <div className="flex items-center rounded-lg border border-border/70 bg-background/50 p-0.5">
            <button
              type="button"
              onClick={() => onChartMetricChange("weight")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                chartMetric === "weight"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Weight
            </button>
            <button
              type="button"
              onClick={() => onChartMetricChange("bmi")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                chartMetric === "bmi"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              BMI
            </button>
          </div>

          {/* Range Filters */}
          <div className="flex items-center rounded-lg border border-border/70 bg-background/50 p-0.5">
            {(["7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onTimeRangeChange(r)}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-mono uppercase font-semibold transition-all cursor-pointer",
                  timeRange === r
                    ? "bg-muted text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <Link
            href="/bmi"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2"
            )}
          >
            Log Entry
            <ArrowRight className="size-3.5 ml-1" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {filteredChartData.length > 0 ? (
          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="telemetryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={chartMetric === "weight" ? "#10b981" : "#06b6d4"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={chartMetric === "weight" ? "#10b981" : "#06b6d4"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatSafeDate}
                  tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <YAxis
                  domain={
                    chartMetric === "weight"
                      ? ["dataMin - 1", "dataMax + 1"]
                      : ["dataMin - 0.5", "dataMax + 0.5"]
                  }
                  tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-border/80 bg-[#0B0F0E]/95 p-3 shadow-2xl backdrop-blur-md">
                          <p className="text-[11px] font-mono text-muted-foreground">
                            {formatSafeDate(String(label))}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="size-2 rounded-full"
                              style={{
                                backgroundColor:
                                  chartMetric === "weight" ? "#10b981" : "#06b6d4",
                              }}
                            />
                            <span className="text-sm font-bold font-mono text-foreground">
                              {payload[0].value} {chartMetric === "weight" ? "kg" : "BMI"}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  name={chartMetric === "weight" ? "Weight (kg)" : "BMI"}
                  stroke={chartMetric === "weight" ? "#10b981" : "#06b6d4"}
                  strokeWidth={2.5}
                  dot={{
                    r: 3.5,
                    fill: chartMetric === "weight" ? "#10b981" : "#06b6d4",
                    strokeWidth: 2,
                    stroke: "#0B0F0E",
                  }}
                  activeDot={{
                    r: 6,
                    fill: chartMetric === "weight" ? "#10b981" : "#06b6d4",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                  fillOpacity={1}
                  fill="url(#telemetryGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-68 flex-col items-center justify-center gap-3 text-center text-xs text-muted-foreground">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center">
              <Scale className="size-6 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">No biometric records in this cycle</p>
              <p className="text-[11px] text-muted-foreground">
                Record your initial weigh-in to plot telemetry progression.
              </p>
            </div>
            <Link
              href="/bmi"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-primary text-primary-foreground font-semibold text-xs h-8 px-3 mt-1"
              )}
            >
              <Plus className="size-3.5 mr-1" />
              Record Baseline Entry
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
