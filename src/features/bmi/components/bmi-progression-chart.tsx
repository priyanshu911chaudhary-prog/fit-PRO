import React from "react";
import { Activity, Scale } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { BmiChartPoint, BmiChartMetric } from "../types";

interface BmiProgressionChartProps {
  chartData: BmiChartPoint[];
  chartMetric: BmiChartMetric;
  onChartMetricChange: (metric: BmiChartMetric) => void;
}

export function BmiProgressionChart({
  chartData,
  chartMetric,
  onChartMetricChange,
}: BmiProgressionChartProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3 border-b border-border/40">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="size-4 text-emerald-400" />
            Anthropometric Progression Trajectory
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Historical telemetry plotting physiological baseline stability
          </CardDescription>
        </div>

        {/* Metric Switcher */}
        <div className="flex items-center rounded-lg border border-border/70 bg-background/50 p-0.5">
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
            BMI Score
          </button>
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
            Weight (kg)
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {chartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bmiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                />
                <YAxis
                  domain={chartMetric === "bmi" ? ["dataMin - 0.5", "dataMax + 0.5"] : ["dataMin - 1", "dataMax + 1"]}
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
                            {label}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="size-2 rounded-full bg-emerald-400" />
                            <span className="text-sm font-bold font-mono text-foreground">
                              {payload[0].value} {chartMetric === "bmi" ? "BMI" : "kg"}
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
                  name={chartMetric === "bmi" ? "BMI" : "Weight (kg)"}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: "#10b981", strokeWidth: 2, stroke: "#0B0F0E" }}
                  activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                  fillOpacity={1}
                  fill="url(#bmiGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center gap-3 text-center text-xs text-muted-foreground">
            <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center">
              <Scale className="size-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-foreground">No historical measurements found</p>
              <p className="text-[11px] text-muted-foreground">
                Submit your initial height and weight to plot your anthropometric trajectory.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
