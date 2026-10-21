"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { MealLogRecord, MacroBreakdown, DailyNutritionTarget } from "../types";
import { normalizeDateOnly, shiftCalendarDay } from "@/lib/nutrition-engine";

export function useMealHistory() {
  const [selectedDate, setSelectedDate] = useState<string>(() => normalizeDateOnly());
  const [history, setHistory] = useState<MealLogRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [dailyTotals, setDailyTotals] = useState<MacroBreakdown>({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    proteinCals: 0,
    carbsCals: 0,
    fatCals: 0,
    proteinPct: 0,
    carbsPct: 0,
    fatPct: 0,
  });
  const [dailyTargets, setDailyTargets] = useState<DailyNutritionTarget>({});

  // Fetch configured daily targets once from dashboard stats
  useEffect(() => {
    let isMounted = true;
    apiClient<{
      currentMetrics?: { tdee?: number; bmr?: number };
      profile?: { fitnessGoal?: string };
    }>("/api/dashboard/stats")
      .then((res) => {
        if (!isMounted || !res.data) return;
        const tdee = res.data.currentMetrics?.tdee;
        if (tdee && tdee > 0) {
          // Standard fitness distribution target
          setDailyTargets({
            targetCalories: Math.round(tdee),
            targetProtein: Math.round((tdee * 0.3) / 4),
            targetCarbs: Math.round((tdee * 0.45) / 4),
            targetFat: Math.round((tdee * 0.25) / 9),
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchHistory = useCallback(async (dateToFetch = selectedDate) => {
    try {
      const res = await apiClient<{
        logs: MealLogRecord[];
        dailyTotals?: MacroBreakdown;
      }>(`/api/meal?date=${dateToFetch}&limit=50&_t=${Date.now()}`, {
        cache: "no-store",
      });

      if (res.data) {
        setHistory(res.data.logs || []);
        if (res.data.dailyTotals) {
          setDailyTotals(res.data.dailyTotals);
        }
      }
    } catch {
      toast.error("Failed to load daily nutrition records");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    let isMounted = true;
    apiClient<{
      logs: MealLogRecord[];
      dailyTotals?: MacroBreakdown;
    }>(`/api/meal?date=${selectedDate}&limit=50&_t=${Date.now()}`, {
      cache: "no-store",
    })
      .then((res) => {
        if (!isMounted || !res.data) return;
        setHistory(res.data.logs || []);
        if (res.data.dailyTotals) {
          setDailyTotals(res.data.dailyTotals);
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

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await apiClient(`/api/meal/${id}`, {
        method: "DELETE",
      });
      if (res.success) {
        toast.success("Meal record deleted");
        await fetchHistory(selectedDate);
      }
    } catch {
      toast.error("Failed to delete meal log");
    }
  };

  return {
    selectedDate,
    setSelectedDate,
    history,
    isLoadingHistory,
    dailyTotals,
    dailyTargets,
    fetchHistory,
    handlePrevDay,
    handleNextDay,
    handleSetToday,
    handleDeleteLog,
  };
}
