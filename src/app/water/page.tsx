"use client";

import React, { useEffect, useState } from "react";
import {
  Droplet,
  Plus,
  RotateCcw,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

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

export default function WaterPage() {
  const [data, setData] = useState<TodayWaterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(300);

  const fetchTodayWater = async () => {
    try {
      const res = await apiClient<{
        totalMl?: number;
        todayStr?: string;
        logs?: WaterLog[];
        water?: TodayWaterResponse;
      }>("/api/water/today");
      if (res.success && res.data) {
        const total = res.data.totalMl ?? res.data.water?.totalAmount ?? 0;
        const target = res.data.water?.targetAmount ?? 2500;
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
      logs?: WaterLog[];
      water?: TodayWaterResponse;
    }>("/api/water/today")
      .then((res) => {
        if (isMounted && res.success && res.data) {
          const total = res.data.totalMl ?? res.data.water?.totalAmount ?? 0;
          const target = res.data.water?.targetAmount ?? 2500;
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
        toast.success(`Logged ${amount} ml of water!`);
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
        toast.success("Entry removed");
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
  const target = data?.targetAmount || 2500;
  const percentage = Math.min(Math.round((total / target) * 100), 100);
  const glasses = Math.round((total / 250) * 10) / 10;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Hydration Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accepts IANA timezone to ensure your daily intake resets at your local midnight.
          </p>
        </div>

        {data && data.logs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndoLast}
            className="border-border text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Undo Last Entry
          </Button>
        )}
      </div>

      {/* Main Hydration Progress Hero */}
      <Card className="border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <CardContent className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
          <div className="relative flex items-center justify-center">
            {/* Circular Ring SVG representation */}
            <div className="size-48 sm:size-56 relative flex items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-muted/40"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-cyan-500 transition-all duration-700 ease-out"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * percentage) / 100}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <Droplet className="size-7 text-cyan-400 mb-1 animate-pulse" />
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">{total}</span>
                <span className="text-xs text-muted-foreground font-semibold">/ {target} ml</span>
                <span className="text-[11px] font-bold text-cyan-400 mt-1">{percentage}%</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold">
              {percentage >= 100 ? "Hydration Goal Achieved! 🏆" : `${glasses} glasses consumed today`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {percentage >= 100
                ? "You have reached your daily baseline target. Outstanding hydration discipline!"
                : `Drink ${Math.max(0, target - total)} ml more to reach your optimal cellular hydration goal.`}
            </p>
          </div>

          {/* Quick Add Buttons */}
          <div className="w-full max-w-md grid grid-cols-3 gap-2.5 pt-2">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAddWater(250)}
              variant="outline"
              className="h-12 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 flex flex-col items-center justify-center py-1 text-cyan-400"
            >
              <span className="text-xs font-bold">+250 ml</span>
              <span className="text-[10px] text-muted-foreground">Glass</span>
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAddWater(500)}
              variant="outline"
              className="h-12 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 flex flex-col items-center justify-center py-1 text-cyan-400"
            >
              <span className="text-xs font-bold">+500 ml</span>
              <span className="text-[10px] text-muted-foreground">Bottle</span>
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAddWater(750)}
              variant="outline"
              className="h-12 border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 flex flex-col items-center justify-center py-1 text-cyan-400"
            >
              <span className="text-xs font-bold">+750 ml</span>
              <span className="text-[10px] text-muted-foreground">Sports Shaker</span>
            </Button>
          </div>

          {/* Custom Add Row */}
          <div className="flex items-center gap-2 max-w-xs w-full pt-1">
            <Input
              type="number"
              min={50}
              max={3000}
              step={50}
              value={customAmount}
              onChange={(e) => setCustomAmount(Number(e.target.value))}
              placeholder="Amount (ml)"
              className="text-xs h-9 bg-background/50"
            />
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleAddWater(customAmount)}
              size="sm"
              id="water-add-btn"
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs h-9 px-3 shrink-0"
            >
              <Plus className="size-3.5 mr-1" />
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              id="water-undo-btn"
              disabled={isSubmitting || !data?.logs || data.logs.length === 0}
              onClick={handleUndoLast}
              className="text-xs h-9 px-3 border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 shrink-0"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Undo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Intake History Log */}
      <Card className="border-border/60 bg-card/75 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-bold">Today&apos;s Logs</CardTitle>
            <CardDescription className="text-xs">
              Individual timestamps recorded for today&apos;s hydration.
            </CardDescription>
          </div>
          {data?.logs && data.logs.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              id="water-undo-header-btn"
              disabled={isSubmitting}
              onClick={handleUndoLast}
              className="text-xs text-muted-foreground hover:text-cyan-400 h-8 px-2"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Undo Last
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 text-cyan-500 animate-spin" />
            </div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No water logged yet today. Use the buttons above to record your first glass!
            </div>
          ) : (
            <div className="space-y-2">
              {data.logs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                      <Droplet className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {log.amountMl ?? log.amount ?? 0} ml
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.date || log.createdAt
                          ? new Date(log.date || log.createdAt!).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Today"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(log._id)}
                    className="size-7 text-muted-foreground hover:text-rose-500 transition-colors"
                    aria-label="Delete water log"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
