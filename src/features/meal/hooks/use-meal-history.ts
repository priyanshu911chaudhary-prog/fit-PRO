"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { MealLogRecord } from "../types";

export function useMealHistory() {
  const [history, setHistory] = useState<MealLogRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const res = await apiClient<{ logs: MealLogRecord[] }>("/api/meal");
      if (res.data?.logs) {
        setHistory(res.data.logs);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient<{ logs: MealLogRecord[] }>("/api/meal")
      .then((res) => {
        if (isMounted && res.data?.logs) {
          setHistory(res.data.logs);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await apiClient(`/api/meal/${id}`, {
        method: "DELETE",
      });
      if (res.success) {
        toast.success("Meal log removed");
        await fetchHistory();
      }
    } catch {
      toast.error("Failed to delete meal log");
    }
  };

  return {
    history,
    isLoadingHistory,
    fetchHistory,
    handleDeleteLog,
  };
}
