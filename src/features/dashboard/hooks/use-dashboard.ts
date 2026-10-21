"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { ChartMetric, DashboardStats, TimeRange } from "../types";
import {
  filterChartData,
  calculateMetricDelta,
  getGreeting,
} from "../lib/dashboard-helpers";

export function useDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addingWater, setAddingWater] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>("weight");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const greeting = useMemo(() => getGreeting(), []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiClient<DashboardStats & { stats?: DashboardStats }>(
        "/api/dashboard/stats"
      );
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
  }, [router]);

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
  const filteredChartData = useMemo(() => {
    return filterChartData(stats?.weightHistory, timeRange);
  }, [stats?.weightHistory, timeRange]);

  const metricDelta = useMemo(() => {
    return calculateMetricDelta(filteredChartData, chartMetric);
  }, [filteredChartData, chartMetric]);

  return {
    user,
    stats,
    metrics,
    water,
    streak,
    greeting,
    isLoading,
    addingWater,
    chartMetric,
    setChartMetric,
    timeRange,
    setTimeRange,
    filteredChartData,
    metricDelta,
    handleQuickAddWater,
    router,
  };
}
