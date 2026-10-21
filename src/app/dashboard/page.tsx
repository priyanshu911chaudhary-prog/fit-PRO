"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Flame,
  Dumbbell,
  Utensils,
  Droplet,
  Scale,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Plus,
  Loader2,
  Calendar,
  CheckCircle2,
  Activity,
  Zap,
  Clock,
  ChevronRight,
  Shield,
  Layers,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
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

interface DashboardStats {
  streak: number;
  waterToday: {
    totalMl: number;
    targetMl: number;
    percentage: number;
  };
  metrics: {
    bmi: number;
    category: string;
    bmr: number;
    tdee: number;
    weight: number;
    height: number;
  };
  weightHistory: Array<{
    date: string;
    weight: number;
    bmi: number;
  }>;
  recentWorkouts: Array<{
    _id: string;
    date: string;
    workoutType: string;
    duration: number;
    exercisesCount: number;
  }>;
  recentMeals: Array<{
    _id: string;
    date: string;
    mealType: string;
    totalCalories: number;
  }>;
}

function formatSafeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addingWater, setAddingWater] = useState(false);
  const [chartMetric, setChartMetric] = useState<"weight" | "bmi">("weight");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "all">("all");

  const greeting = (() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const fetchStats = async () => {
    try {
      const res = await apiClient<DashboardStats & { stats?: DashboardStats }>("/api/dashboard/stats");
      const fetchedStats = res.data?.stats || res.data;
      if (res.success && fetchedStats) {
        setStats(fetchedStats);
      }
    } catch (err: unknown) {
      if ((err as { statusCode?: number })?.statusCode === 404) {
        router.push("/onboarding");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient<DashboardStats & { stats?: DashboardStats }>("/api/dashboard/stats")
      .then((res) => {
        const fetchedStats = res.data?.stats || res.data;
        if (isMounted && res.success && fetchedStats) {
          setStats(fetchedStats);
        }
      })
      .catch((err: unknown) => {
        if (isMounted && (err as { statusCode?: number })?.statusCode === 404) {
          router.push("/onboarding");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleQuickAddWater = async (ml: number) => {
    try {
      setAddingWater(true);
      const res = await apiClient("/api/water", {
        method: "POST",
        body: JSON.stringify({ amountMl: ml }),
      });
      if (res.success) {
        toast.success(`+${ml}ml Hydration Logged`, {
          description: "Target progress updated instantly.",
        });
        await fetchStats();
      }
    } catch {
      toast.error("Failed to log water intake");
    } finally {
      setAddingWater(false);
    }
  };

  const metrics = stats?.metrics;
  const water = stats?.waterToday;
  const streak = stats?.streak || 0;
  const weightData = stats?.weightHistory || [];

  const filteredChartData = useMemo(() => {
    if (!weightData || weightData.length === 0) return [];
    if (timeRange === "7d") return weightData.slice(-7);
    if (timeRange === "30d") return weightData.slice(-30);
    return weightData;
  }, [weightData, timeRange]);

  const metricDelta = useMemo(() => {
    if (filteredChartData.length < 2) return null;
    const first = filteredChartData[0][chartMetric];
    const last = filteredChartData[filteredChartData.length - 1][chartMetric];
    const diff = Number((last - first).toFixed(1));
    return {
      diff,
      isPositive: diff > 0,
      isZero: diff === 0,
      unit: chartMetric === "weight" ? "kg" : "pts",
    };
  }, [filteredChartData, chartMetric]);

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-[70vh] flex-col items-center justify-center p-12 space-y-4">
        <div className="relative">
          <div className="size-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="size-5 text-emerald-400 animate-pulse" />
          </div>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
          Calibrating Telemetry Cockpit...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Athlete Live Status Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Athlete Greeting & Live Telemetry Badge */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
                LIVE COCKPIT SYNC
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                BASELINE CALIBRATED
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                {user?.name || "Athlete"}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Precision physiological telemetry, metabolic expenditures, and adaptive workout progressions.
            </p>
          </div>

          {/* Quick Toolbar & Streak HUD */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Streak Counter Pill */}
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 shadow-xs">
              <Flame className="size-4 text-amber-400 fill-amber-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold font-mono text-amber-300">
                  {streak} <span className="font-sans font-normal text-amber-200/80">DAY STREAK</span>
                </div>
                <div className="text-[10px] text-amber-400/70 font-medium">Progressive Overload</div>
              </div>
            </div>

            {/* AI Coach Action Button */}
            <Link
              href="/coach"
              className={cn(
                buttonVariants({ size: "sm" }),
                "relative group overflow-hidden bg-primary text-primary-foreground font-semibold text-xs h-10 px-4 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-cyan-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
              <Sparkles className="size-4 mr-1.5 text-emerald-200" />
              Ask AI Coach
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Four Telemetry HUD Metric Cards */}
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
          subtext="Target: Cellular recovery & muscular hydration"
          icon={<Droplet className="size-4 text-cyan-400" />}
          actionLabel={addingWater ? "..." : "+250ml"}
          onAction={() => handleQuickAddWater(250)}
        />

        {/* Metric 2: Current BMI */}
        <MetricCard
          title="Body Mass Index"
          value={metrics?.bmi || "--"}
          unit={metrics?.weight ? `(${metrics.weight} kg)` : ""}
          statusText={metrics?.category ? metrics.category.toUpperCase() : "NORMAL"}
          statusVariant="default"
          accent="emerald"
          subtext={`Height: ${metrics?.height || "--"} cm • Weight: ${metrics?.weight || "--"} kg`}
          icon={<Scale className="size-4 text-emerald-400" />}
          actionLabel="Log Weigh-In"
          onAction={() => router.push("/bmi")}
        />

        {/* Metric 3: Resting BMR */}
        <MetricCard
          title="Basal Metabolic Rate"
          value={metrics?.bmr || "--"}
          unit="kcal / day"
          statusText="RESTING FLOOR"
          statusVariant="outline"
          accent="amber"
          subtext="Mifflin-St Jeor basal caloric baseline"
          icon={<Flame className="size-4 text-amber-400" />}
          actionLabel="Recalibrate"
          onAction={() => router.push("/onboarding")}
        />

        {/* Metric 4: Maintenance TDEE */}
        <MetricCard
          title="Active TDEE Budget"
          value={metrics?.tdee || "--"}
          unit="kcal / day"
          statusText="EXPENDITURE"
          statusVariant="outline"
          accent="purple"
          subtext="Daily caloric maintenance with activity coefficient"
          icon={<TrendingUp className="size-4 text-purple-400" />}
          actionLabel="Meal Fuel"
          onAction={() => router.push("/meal")}
        />
      </div>

      {/* 3. Middle Bento Grid: Progression Telemetry & Tactical Launchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Bento (8 cols): Progression Telemetry Console */}
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
                    {metricDelta.isPositive ? `+${metricDelta.diff}` : metricDelta.diff} {metricDelta.unit}
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
                  onClick={() => setChartMetric("weight")}
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
                  onClick={() => setChartMetric("bmi")}
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
                    onClick={() => setTimeRange(r)}
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
                  <AreaChart data={filteredChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      domain={chartMetric === "weight" ? ["dataMin - 1", "dataMax + 1"] : ["dataMin - 0.5", "dataMax + 0.5"]}
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
                                    backgroundColor: chartMetric === "weight" ? "#10b981" : "#06b6d4",
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

        {/* Right Bento (4 cols): Tactical Launchpad */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Zap className="size-4 text-emerald-400" />
                  Tactical Launchpad
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
                  READY
                </Badge>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Rapid operational logging & protocol generation
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {/* Module 1: Workout Session */}
              <Link
                href="/workout"
                className="group flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/40 hover:bg-emerald-500/5 hover:border-emerald-500/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Dumbbell className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                      Log Workout Session
                    </div>
                    <div className="text-[11px] text-muted-foreground">Sets, reps, intensity & load</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </Link>

              {/* Module 2: Meal & Macros */}
              <Link
                href="/meal"
                className="group flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/40 hover:bg-cyan-500/5 hover:border-cyan-500/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Utensils className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                      Log Meal & Macros
                    </div>
                    <div className="text-[11px] text-muted-foreground">Caloric budget & protein breakdown</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </Link>

              {/* Module 3: 3-Day Adaptive Plans */}
              <Link
                href="/plans"
                className="group flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/40 hover:bg-purple-500/5 hover:border-purple-500/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Calendar className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-purple-400 transition-colors">
                      3-Day AI Plans
                    </div>
                    <div className="text-[11px] text-muted-foreground">Algorithmic training & rest splits</div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </Link>

              {/* Module 4: Quick Water Boost */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplet className="size-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-foreground">Rapid Hydration Boost</span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                    {water?.totalMl || 0} ml
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addingWater}
                    onClick={() => handleQuickAddWater(250)}
                    className="h-8 text-xs font-medium border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer"
                  >
                    +250 ml
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={addingWater}
                    onClick={() => handleQuickAddWater(500)}
                    className="h-8 text-xs font-medium border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer"
                  >
                    +500 ml
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. Bottom Row: Dual Activity Ledgers (Recent Workouts & Recent Meals) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Workouts */}
        <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Dumbbell className="size-4 text-emerald-400" />
                Training Session Ledger
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Verified athletic workouts & volume load
              </CardDescription>
            </div>
            <Link
              href="/workout"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2"
              )}
            >
              View All
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </CardHeader>

          <CardContent className="pt-3">
            {stats?.recentWorkouts && stats.recentWorkouts.length > 0 ? (
              <div className="divide-y divide-border/40">
                {stats.recentWorkouts.map((wk) => (
                  <div
                    key={wk._id}
                    className="py-3 flex items-center justify-between group hover:bg-muted/10 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                          {wk.workoutType}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{wk.exercisesCount} exercises</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {wk.duration} mins
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono border-border/80 text-muted-foreground">
                      {formatSafeDate(wk.date)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground space-y-3">
                <div className="size-10 rounded-xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
                  <Dumbbell className="size-5 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">No workouts recorded this cycle</p>
                  <p className="text-[11px] text-muted-foreground">
                    Log your exercises to trigger progression telemetry.
                  </p>
                </div>
                <Link
                  href="/workout"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-primary text-primary-foreground font-semibold text-xs h-8 px-3"
                  )}
                >
                  <Plus className="size-3.5 mr-1" />
                  Start Workout
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Recent Meals */}
        <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Utensils className="size-4 text-cyan-400" />
                Nutrition & Fuel Ledger
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Macronutrient intake and caloric burn balance
              </CardDescription>
            </div>
            <Link
              href="/meal"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-xs font-semibold text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-7 px-2"
              )}
            >
              View All
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </CardHeader>

          <CardContent className="pt-3">
            {stats?.recentMeals && stats.recentMeals.length > 0 ? (
              <div className="divide-y divide-border/40">
                {stats.recentMeals.map((meal) => (
                  <div
                    key={meal._id}
                    className="py-3 flex items-center justify-between group hover:bg-muted/10 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Utensils className="size-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                          {meal.mealType}
                        </div>
                        <div className="text-[11px] font-mono text-cyan-400/90 mt-0.5">
                          {meal.totalCalories} kcal logged
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] font-mono border-border/80 text-muted-foreground">
                      {formatSafeDate(meal.date)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-muted-foreground space-y-3">
                <div className="size-10 rounded-xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
                  <Utensils className="size-5 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">No nutrition logged today</p>
                  <p className="text-[11px] text-muted-foreground">
                    Record your meals to balance against your active TDEE budget.
                  </p>
                </div>
                <Link
                  href="/meal"
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-primary text-primary-foreground font-semibold text-xs h-8 px-3"
                  )}
                >
                  <Plus className="size-3.5 mr-1" />
                  Log Meal & Macros
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
