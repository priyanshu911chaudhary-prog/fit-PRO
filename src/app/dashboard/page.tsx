"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addingWater, setAddingWater] = useState(false);
  const [chartMetric, setChartMetric] = useState<"weight" | "bmi">("weight");

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
        toast.success(`Logged ${ml}ml of water!`);
        await fetchStats();
      }
    } catch {
      toast.error("Failed to log water");
    } finally {
      setAddingWater(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="size-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const metrics = stats?.metrics;
  const water = stats?.waterToday;
  const streak = stats?.streak || 0;
  const weightData = stats?.weightHistory || [];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back,{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              {user?.name || "Athlete"}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is your daily physical performance and recovery breakdown.
          </p>
        </div>

        {/* Streak Pill & AI Coach Quick Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-400 shadow-sm">
            <Flame className="size-5 fill-amber-500 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-xs font-bold leading-none">{streak} Day Streak</span>
              <span className="text-[10px] text-amber-400/80 leading-tight">Consistency King</span>
            </div>
          </div>

          <Link
            href="/coach"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white shadow-md shadow-indigo-500/20 font-medium"
            )}
          >
            <Sparkles className="size-4 mr-1.5" />
            Chat With Coach
          </Link>
        </div>
      </div>

      {/* Metrics 4-Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BMI Card */}
        <Link href="/bmi" className="block group">
          <Card className="border-border/60 bg-card/60 backdrop-blur-md hover:border-indigo-500/50 transition-all cursor-pointer h-full">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                  <span>Current BMI</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                  <Scale className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold">{metrics?.bmi || "--"}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 capitalize">
                    {metrics?.category || "Normal"}
                  </span>
                  <span className="text-xs text-muted-foreground">({metrics?.weight || "--"} kg)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* BMR Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md hover:border-emerald-500/30 transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resting BMR
              </span>
              <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Flame className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold">{metrics?.bmr || "--"}</div>
              <p className="text-xs text-muted-foreground mt-1">kcal minimum daily baseline</p>
            </div>
          </CardContent>
        </Card>

        {/* TDEE Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md hover:border-fuchsia-500/30 transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Maintenance TDEE
              </span>
              <div className="size-8 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold">{metrics?.tdee || "--"}</div>
              <p className="text-xs text-muted-foreground mt-1">kcal total daily expenditure</p>
            </div>
          </CardContent>
        </Card>

        {/* Water Card */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-md hover:border-cyan-500/30 transition-all">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <Link
                href="/water"
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-cyan-400 transition-colors flex items-center gap-1 group"
              >
                <span>Hydration Today</span>
                <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/water"
                className="size-8 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 flex items-center justify-center transition-colors"
                title="Manage hydration"
              >
                <Droplet className="size-4" />
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-extrabold">{water?.totalMl || 0}</span>
                <span className="text-xs text-muted-foreground">/ {water?.targetMl || 2500} ml</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(water?.percentage || 0, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={addingWater}
                  onClick={() => handleQuickAddWater(250)}
                  className="h-6 text-[10px] px-2 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
                >
                  <Plus className="size-3 mr-0.5" />
                  250ml
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={addingWater}
                  onClick={() => handleQuickAddWater(500)}
                  className="h-6 text-[10px] px-2 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400"
                >
                  <Plus className="size-3 mr-0.5" />
                  500ml
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts & Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weight & BMI Trend Chart */}
        <Card className="lg:col-span-2 border-border/60 bg-card/70 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold">
                {chartMetric === "weight" ? "Weight Progress Trend" : "BMI Trajectory"}
              </CardTitle>
              <CardDescription className="text-xs">
                {chartMetric === "weight"
                  ? "Historical weight trajectory and stability over time"
                  : "Body Mass Index progression across healthy baselines"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMetric("weight")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                    chartMetric === "weight"
                      ? "bg-indigo-600 text-white shadow-sm"
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
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  BMI
                </button>
              </div>
              <Link
                href="/bmi"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-xs font-semibold text-indigo-400 flex items-center"
                )}
              >
                Log Entry
                <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {weightData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bmiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={chartMetric === "weight" ? ["dataMin - 2", "dataMax + 2"] : ["dataMin - 1", "dataMax + 1"]}
                      tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    {chartMetric === "weight" ? (
                      <Area
                        type="monotone"
                        dataKey="weight"
                        name="Weight (kg)"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#6366f1" }}
                        activeDot={{ r: 6 }}
                        fillOpacity={1}
                        fill="url(#weightGrad)"
                      />
                    ) : (
                      <Area
                        type="monotone"
                        dataKey="bmi"
                        name="BMI"
                        stroke="#a855f7"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#a855f7" }}
                        activeDot={{ r: 6 }}
                        fillOpacity={1}
                        fill="url(#bmiGrad)"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <Scale className="size-8 opacity-40" />
                <p>No measurement logs recorded yet.</p>
                <Link
                  href="/bmi"
                  className={buttonVariants({ size: "xs", variant: "outline" })}
                >
                  Record baseline measurement
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Launchpad & Daily Actions */}
        <div className="space-y-4">
          <Card className="border-border/60 bg-card/70 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Quick Launchpad</CardTitle>
              <CardDescription className="text-xs">
                Instantly track today&apos;s exercises and meals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Link
                href="/workout"
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Dumbbell className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Log Workout</p>
                    <p className="text-[11px] text-muted-foreground">Track sets, reps, weight</p>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/meal"
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Utensils className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Log Meal</p>
                    <p className="text-[11px] text-muted-foreground">Server-calculated macros</p>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/plans"
                className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/70 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">AI Plan Generator</p>
                    <p className="text-[11px] text-muted-foreground">Gemini workout & meal plans</p>
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Recent Activity Section: Workouts & Meals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Workouts */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Dumbbell className="size-4 text-indigo-400" />
                Recent Workouts
              </CardTitle>
              <CardDescription className="text-xs">
                Your latest logged training sessions
              </CardDescription>
            </div>
            <Link
              href="/workout"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-xs font-semibold text-indigo-400 flex items-center"
              )}
            >
              Log Session
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentWorkouts && stats.recentWorkouts.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recentWorkouts.map((w) => (
                  <div
                    key={w._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:border-indigo-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        <Dumbbell className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground capitalize">
                          {w.workoutType}
                        </p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{w.duration} mins</span>
                          <span>•</span>
                          <span>{w.exercisesCount} exercises</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium rounded-md bg-muted/50 px-2 py-1">
                      {w.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground space-y-2">
                <Dumbbell className="size-8 opacity-30 text-indigo-400" />
                <p>No workouts recorded yet.</p>
                <Link
                  href="/workout"
                  className={buttonVariants({ size: "xs", variant: "outline" })}
                >
                  Start your first workout
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Meals */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Utensils className="size-4 text-emerald-400" />
                Recent Nutrition
              </CardTitle>
              <CardDescription className="text-xs">
                Your latest recorded meals & calories
              </CardDescription>
            </div>
            <Link
              href="/meal"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-xs font-semibold text-emerald-400 flex items-center"
              )}
            >
              Log Meal
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.recentMeals && stats.recentMeals.length > 0 ? (
              <div className="space-y-2.5">
                {stats.recentMeals.map((m) => (
                  <div
                    key={m._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        <Utensils className="size-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground capitalize">
                          {m.mealType}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-semibold text-emerald-400">{m.totalCalories}</span> kcal
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium rounded-md bg-muted/50 px-2 py-1">
                      {m.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground space-y-2">
                <Utensils className="size-8 opacity-30 text-emerald-400" />
                <p>No meals logged yet today.</p>
                <Link
                  href="/meal"
                  className={buttonVariants({ size: "xs", variant: "outline" })}
                >
                  Track your food
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
