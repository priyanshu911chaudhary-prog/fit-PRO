"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { WorkoutLogRecord, DailyWorkoutSummary } from "../types";
import { normalizeDateOnly, shiftCalendarDay } from "@/lib/nutrition-engine";

export function useWorkoutHistory() {
  const [selectedDate, setSelectedDate] = useState<string>(() => normalizeDateOnly());
  const [history, setHistory] = useState<WorkoutLogRecord[]>([]);
  const [allHistory, setAllHistory] = useState<WorkoutLogRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [dailyTotals, setDailyTotals] = useState<DailyWorkoutSummary>({
    totalVolumeTonnage: 0,
    exercisesCount: 0,
    totalSetsCount: 0,
    totalDuration: 0,
    estimatedCaloriesBurn: 0,
  });

  const fetchHistory = useCallback(
    async (dateToFetch = selectedDate) => {
      try {
        setIsLoadingHistory(true);
        const [dayRes, allRes] = await Promise.all([
          apiClient<{ logs: WorkoutLogRecord[]; dailyTotals?: DailyWorkoutSummary }>(
            `/api/workout?date=${dateToFetch}&limit=50&_t=${Date.now()}`,
            { cache: "no-store" }
          ),
          apiClient<{ logs: WorkoutLogRecord[] }>("/api/workout?limit=50", { cache: "no-store" }),
        ]);

        if (dayRes.data) {
          setHistory(dayRes.data.logs || []);
          if (dayRes.data.dailyTotals) {
            setDailyTotals(dayRes.data.dailyTotals);
          }
        }
        if (allRes.data?.logs) {
          setAllHistory(allRes.data.logs);
        }
      } catch {
        toast.error("Failed to load workout records");
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      apiClient<{ logs: WorkoutLogRecord[]; dailyTotals?: DailyWorkoutSummary }>(
        `/api/workout?date=${selectedDate}&limit=50&_t=${Date.now()}`,
        { cache: "no-store" }
      ),
      apiClient<{ logs: WorkoutLogRecord[] }>("/api/workout?limit=50", { cache: "no-store" }),
    ])
      .then(([dayRes, allRes]) => {
        if (!isMounted) return;
        if (dayRes.data) {
          setHistory(dayRes.data.logs || []);
          if (dayRes.data.dailyTotals) {
            setDailyTotals(dayRes.data.dailyTotals);
          }
        }
        if (allRes.data?.logs) {
          setAllHistory(allRes.data.logs);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  const handlePrevDay = () => {
    setSelectedDate((prev) => shiftCalendarDay(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => shiftCalendarDay(prev, 1));
  };

  const handleSetToday = () => {
    setSelectedDate(normalizeDateOnly());
  };

  const handleDeleteLog = useCallback(
    async (id: string) => {
      try {
        const res = await apiClient(`/api/workout/${id}`, {
          method: "DELETE",
        });
        if (res.success) {
          toast.success("Session log removed");
          await fetchHistory(selectedDate);
        }
      } catch {
        toast.error("Failed to delete workout log");
      }
    },
    [fetchHistory, selectedDate]
  );

  return {
    selectedDate,
    setSelectedDate,
    history,
    allHistory,
    dailyTotals,
    isLoadingHistory,
    fetchHistory,
    handlePrevDay,
    handleNextDay,
    handleSetToday,
    handleDeleteLog,
  };
}
