"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import {
  Scale,
  Plus,
  Minus,
  Loader2,
  History,
  TrendingUp,
  Activity,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { calculateBMI } from "@/lib/fitness-calc";
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

interface BmiRecord {
  _id?: string;
  id?: string;
  weight: number;
  height: number;
  bmi: number;
  category: string;
  date?: string;
  createdAt?: string | Date;
}

function BmiContent() {
  const [history, setHistory] = useState<BmiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chartMetric, setChartMetric] = useState<"bmi" | "weight">("bmi");

  // Form fields
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);

  const fetchHistory = async () => {
    try {
      const res = await apiClient<BmiRecord[] | { history?: BmiRecord[]; records?: BmiRecord[] }>("/api/bmi");
      const records = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as { history?: BmiRecord[] })?.history)
        ? (res.data as { history: BmiRecord[] }).history
        : Array.isArray((res.data as { records?: BmiRecord[] })?.records)
        ? (res.data as { records: BmiRecord[] }).records
        : [];

      if (res.success && records) {
        setHistory(records);
        if (records.length > 0) {
          const latest = records[0];
          if (latest.height) setHeight(latest.height);
          if (latest.weight) setWeight(latest.weight);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient<BmiRecord[] | { history?: BmiRecord[]; records?: BmiRecord[] }>("/api/bmi")
      .then((res) => {
        const records = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as { history?: BmiRecord[] })?.history)
          ? (res.data as { history: BmiRecord[] }).history
          : Array.isArray((res.data as { records?: BmiRecord[] })?.records)
          ? (res.data as { records: BmiRecord[] }).records
          : [];

        if (isMounted && res.success && records) {
          setHistory(records);
          if (records.length > 0) {
            const latest = records[0];
            if (latest.height) setHeight(latest.height);
            if (latest.weight) setWeight(latest.weight);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Live calculation preview
  const liveBMI = useMemo(() => calculateBMI(weight, height), [weight, height]);

  // Mifflin-St Jeor estimated BMR reference (using male baseline default)
  const estBmr = useMemo(() => {
    return Math.round(10 * weight + 6.25 * height - 5 * 26 + 5);
  }, [weight, height]);

  // Marker percentage on WHO spectrum (15 to 35 range)
  const spectrumPct = useMemo(() => {
    const val = liveBMI.bmi;
    return Math.min(100, Math.max(0, ((val - 15) / (35 - 15)) * 100));
  }, [liveBMI.bmi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weight < 20 || weight > 300) {
      toast.error("Weight must be between 20 and 300 kg.");
      return;
    }
    if (height < 50 || height > 250) {
      toast.error("Height must be between 50 and 250 cm.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient("/api/bmi", {
        method: "POST",
        body: JSON.stringify({
          weight: Number(weight),
          height: Number(height),
        }),
      });

      if (res.success) {
        toast.success("Anthropometric measurement logged!", {
          description: `Recorded ${weight} kg • ${liveBMI.bmi} BMI (${liveBMI.category})`,
        });
        await fetchHistory();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to log BMI record";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartData = useMemo(() => {
    return [...history].reverse().map((item) => {
      const rawDate = item.date || item.createdAt;
      let displayDate = "Entry";
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          displayDate = parsed.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        } else {
          displayDate = String(rawDate);
        }
      }
      return {
        date: displayDate,
        bmi: item.bmi,
        weight: item.weight,
        height: item.height,
        category: item.category,
      };
    });
  }, [history]);

  // Delta calculation
  const historyDelta = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const latest = chartData[chartData.length - 1];
    const weightDiff = Number((latest.weight - first.weight).toFixed(1));
    const bmiDiff = Number((latest.bmi - first.bmi).toFixed(1));
    return {
      weightDiff,
      bmiDiff,
      isWeightGain: weightDiff > 0,
      isWeightEqual: weightDiff === 0,
    };
  }, [chartData]);

  const categoryColor = {
    underweight: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    normal: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    overweight: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    obese: "border-rose-500/40 text-rose-400 bg-rose-500/10",
  }[liveBMI.category.toLowerCase()] || "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Scale className="size-3.5" />
                ANTHROPOMETRIC ENGINE
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                CALIBRATION ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Biometric Telemetry & Anthropometrics
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Precision body mass index trajectory, WHO classification spectrum, and historical composition tracking.
            </p>
          </div>

          {historyDelta && (
            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="rounded-xl border border-border/70 bg-card/40 px-3.5 py-2 text-xs font-mono">
                <div className="text-muted-foreground text-[10px]">Net Trajectory</div>
                <div className="font-bold text-foreground">
                  <span className={historyDelta.isWeightGain ? "text-amber-400" : "text-emerald-400"}>
                    {historyDelta.weightDiff > 0 ? `+${historyDelta.weightDiff}` : historyDelta.weightDiff} kg
                  </span>
                  <span className="text-muted-foreground ml-1.5">
                    ({historyDelta.bmiDiff > 0 ? `+${historyDelta.bmiDiff}` : historyDelta.bmiDiff} BMI)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Live Anthropometric Measurement Station */}
        <div className="lg:col-span-5 space-y-6">
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
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      onClick={() => setHeight((h) => Math.max(50, h - 1))}
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
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="bg-background/50 border-border/70 text-foreground font-mono text-center text-sm h-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setHeight((h) => Math.min(250, h + 1))}
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
                      onClick={() => setWeight((w) => Math.max(20, Number((w - 0.5).toFixed(1))))}
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
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="bg-background/50 border-border/70 text-foreground font-mono text-center text-sm h-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setWeight((w) => Math.min(300, Number((w + 0.5).toFixed(1))))}
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
        </div>

        {/* Right Column (7 cols): Progression Area Curve */}
        <div className="lg:col-span-7 space-y-4">
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
                  onClick={() => setChartMetric("bmi")}
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
                  onClick={() => setChartMetric("weight")}
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
        </div>
      </div>

      {/* 2. Chronological Anthropometric Ledger */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <History className="size-4 text-emerald-400" />
              Anthropometric Measurement Archive
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Verified chronological records of weight, stature, and computed body composition
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            {history.length} Entries Recorded
          </Badge>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="size-8 text-emerald-400 animate-spin" />
              <p className="text-xs font-mono text-muted-foreground">
                Retrieving biometric archive...
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
              <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
                <Scale className="size-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">No measurements recorded</p>
                <p className="text-[11px] text-muted-foreground">
                  Use the measurement station above to log your current stature and mass.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-border/40 text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Stature</th>
                    <th className="py-3 px-3">Mass</th>
                    <th className="py-3 px-3">Score</th>
                    <th className="py-3 px-3">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {history.map((record, idx) => {
                    const rawDate = record.date || record.createdAt;
                    let displayDate = "Recent";
                    if (rawDate) {
                      const parsed = new Date(rawDate);
                      if (!isNaN(parsed.getTime())) {
                        displayDate = parsed.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                      } else {
                        displayDate = String(rawDate);
                      }
                    }

                    const badgeTone = {
                      underweight: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
                      normal: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
                      overweight: "border-amber-500/30 text-amber-400 bg-amber-500/10",
                      obese: "border-rose-500/30 text-rose-400 bg-rose-500/10",
                    }[record.category?.toLowerCase()] || "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";

                    return (
                      <tr
                        key={record._id || record.id || idx}
                        className="hover:bg-muted/20 transition-colors font-mono"
                      >
                        <td className="py-3 px-3 text-muted-foreground font-medium">{displayDate}</td>
                        <td className="py-3 px-3 text-foreground">{record.height} cm</td>
                        <td className="py-3 px-3 font-bold text-foreground">{record.weight} kg</td>
                        <td className="py-3 px-3 font-extrabold text-emerald-400">{record.bmi}</td>
                        <td className="py-3 px-3">
                          <Badge variant="outline" className={cn("text-[10px] capitalize px-2 py-0.5 font-semibold", badgeTone)}>
                            {record.category}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BmiPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <BmiContent />
    </Suspense>
  );
}
