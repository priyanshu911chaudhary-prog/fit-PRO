"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import {
  Droplet,
  Droplets,
  Plus,
  RotateCcw,
  Trash2,
  Loader2,
  Zap,
  CupSoda,
  Sparkles,
  Award,
  Clock,
  Activity,
  GlassWater,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "cn";

interface WaterLog {
  _id: string;
  amountMl?: number;
  amount?: number;
  date?: string;
  createdAt?: string;
}

interface TodayWaterResponse {
  totalAmount: number;
  targetAmount: number;
  percentage: number;
  logs: WaterLog[];
}

const VESSELS = [
  {
    amount: 250,
    label: "Standard Glass",
    sub: "Hydration sip",
    icon: GlassWater,
  },
  {
    amount: 500,
    label: "Athlete Flask",
    sub: "Hydration bottle",
    icon: Droplet,
  },
  {
    amount: 750,
    label: "Training Shaker",
    sub: "Workout bottle",
    icon: Zap,
  },
  {
    amount: 1000,
    label: "Hydration Jug",
    sub: "Major volume",
    icon: Droplets,
  },
];

function WaterContent() {
  const [data, setData] = useState<TodayWaterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(300);

  const fetchTodayWater = async () => {
    try {
      const res = await apiClient<{
        totalMl?: number;
        todayStr?: string;
        targetAmount?: number;
        logs?: WaterLog[];
        water?: TodayWaterResponse;
      }>("/api/water/today");
      if (res.success && res.data) {
        const total = res.data.totalMl ?? res.data.water?.totalAmount ?? 0;
        const target = res.data.targetAmount ?? res.data.water?.targetAmount ?? 3000;
        const logs = res.data.logs ?? res.data.water?.logs ?? [];
        setData({
          totalAmount: total,
          targetAmount: target,
          percentage: Math.min(Math.round((total / target) * 100), 100),
          logs,
        });
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient<{
      totalMl?: number;
      todayStr?: string;
      targetAmount?: number;
      logs?: WaterLog[];
      water?: TodayWaterResponse;
    }>("/api/water/today")
      .then((res) => {
        if (isMounted && res.success && res.data) {
          const total = res.data.totalMl ?? res.data.water?.totalAmount ?? 0;
          const target = res.data.targetAmount ?? res.data.water?.targetAmount ?? 3000;
          const logs = res.data.logs ?? res.data.water?.logs ?? [];
          setData({
            totalAmount: total,
            targetAmount: target,
            percentage: Math.min(Math.round((total / target) * 100), 100),
            logs,
          });
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

  const handleAddWater = async (amount: number) => {
    if (amount <= 0 || amount > 5000) {
      toast.error("Amount must be between 1 and 5000 ml.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient("/api/water", {
        method: "POST",
        body: JSON.stringify({ amountMl: amount, amount }),
      });

      if (res.success) {
        toast.success(`+${amount} ml Hydration Logged!`, {
          description: "Cellular hydration level recalibrated.",
        });
        await fetchTodayWater();
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to log water";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiClient(`/api/water/${id}`, {
        method: "DELETE",
      });

      if (res.success) {
        toast.success("Hydration log removed");
        await fetchTodayWater();
      }
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const handleUndoLast = async () => {
    if (!data?.logs || data.logs.length === 0) {
      toast.info("No logs to undo");
      return;
    }
    const lastLog = data.logs[0];
    await handleDelete(lastLog._id);
  };

  const total = data?.totalAmount || 0;
  const target = data?.targetAmount || 3000;
  const percentage = Math.min(Math.round((total / target) * 100), 100);
  const remaining = Math.max(0, target - total);
  const glasses = Math.round((total / 250) * 10) / 10;
  const circumference = 2 * Math.PI * 42; // ~263.89

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                <Droplet className="size-3.5" />
                CELLULAR HYDRATION
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                LOCAL TIMEZONE SYNC
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Hydration & Fluid Balance
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Intelligent volumetric tracking, real-time cellular hydration progress, and intake logging.
            </p>
          </div>

          {data && data.logs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              id="water-undo-header-btn"
              disabled={isSubmitting}
              onClick={handleUndoLast}
              className="border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-xs text-cyan-400 hover:text-cyan-300 font-medium h-9 px-3 cursor-pointer self-start md:self-auto"
            >
              <RotateCcw className="size-3.5 mr-1.5" />
              Undo Last Log
            </Button>
          )}
        </div>
      </div>

      {/* 2. Main Radial Hero Card */}
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
                  strokeDashoffset={circumference - (circumference * percentage) / 100}
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
                  onClick={() => handleAddWater(v.amount)}
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
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                placeholder="Amount (ml)"
                className="text-xs font-mono h-9 bg-background/50 border-border/70 text-foreground text-center"
              />
            </div>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAddWater(customAmount)}
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
              disabled={isSubmitting || !data?.logs || data.logs.length === 0}
              onClick={handleUndoLast}
              className="text-xs h-9 px-3 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 shrink-0 cursor-pointer"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Undo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Today's Chronological Intake Log */}
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="size-4 text-cyan-400" />
              Today&apos;s Fluid Intake Stream
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Individual volumetric timestamps logged for today&apos;s recovery cycle
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
            {data?.logs.length || 0} Entries
          </Badge>
        </CardHeader>

        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="size-8 text-cyan-400 animate-spin" />
              <p className="text-xs font-mono text-muted-foreground">
                Syncing hydration log...
              </p>
            </div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-3">
              <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
                <Droplet className="size-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground text-sm">No hydration logs recorded today</p>
                <p className="text-[11px] text-muted-foreground">
                  Tap any vessel above or use the quick custom slider to record intake.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.logs.map((log) => {
                const amountVal = log.amountMl ?? log.amount ?? 0;
                const timeStr = log.date || log.createdAt
                  ? new Date(log.date || log.createdAt!).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Today";

                return (
                  <div
                    key={log._id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card/40 hover:border-cyan-500/40 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Droplet className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold font-mono text-foreground">
                            +{amountVal} ml
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({Math.round((amountVal / 250) * 10) / 10} cups)
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3 text-cyan-400" />
                          Logged at {timeStr}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(log._id)}
                      className="size-8 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                      aria-label="Delete water log"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function WaterPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-5xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <WaterContent />
    </Suspense>
  );
}
