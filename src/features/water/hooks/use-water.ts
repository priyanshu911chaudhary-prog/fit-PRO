"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { WaterLog, TodayWaterResponse } from "../types";
import { calculateHydrationStats } from "../lib/calculations";

interface RawTodayWaterData {
  totalMl?: number;
  todayStr?: string;
  targetAmount?: number;
  logs?: WaterLog[];
  water?: TodayWaterResponse;
}

export function useWater() {
  const [data, setData] = useState<TodayWaterResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(300);

  const fetchTodayWater = useCallback(async () => {
    try {
      const res = await apiClient<RawTodayWaterData>("/api/water/today");
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
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient<RawTodayWaterData>("/api/water/today")
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

  const handleAddWater = useCallback(
    async (amount: number) => {
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
    },
    [fetchTodayWater]
  );

  const handleDelete = useCallback(
    async (id: string) => {
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
    },
    [fetchTodayWater]
  );

  const handleUndoLast = async () => {
    if (!data?.logs || data.logs.length === 0) {
      toast.info("No logs to undo");
      return;
    }
    const lastLog = data.logs[0];
    await handleDelete(lastLog._id);
  };

  const stats = calculateHydrationStats(data?.totalAmount, data?.targetAmount);

  return {
    data,
    stats,
    isLoading,
    isSubmitting,
    customAmount,
    setCustomAmount,
    fetchTodayWater,
    handleAddWater,
    handleDelete,
    handleUndoLast,
  };
}
