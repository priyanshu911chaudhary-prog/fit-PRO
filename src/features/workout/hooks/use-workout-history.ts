"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { WorkoutLogRecord } from "../types";

export function useWorkoutHistory() {
  const [history, setHistory] = useState<WorkoutLogRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoadingHistory(true);
      const res = await apiClient<{ logs: WorkoutLogRecord[] }>("/api/workout");
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
    apiClient<{ logs: WorkoutLogRecord[] }>("/api/workout")
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

  const handleDeleteLog = useCallback(
    async (id: string) => {
      try {
        const res = await apiClient(`/api/workout/${id}`, {
          method: "DELETE",
        });
        if (res.success) {
          toast.success("Session log removed");
          await fetchHistory();
        }
      } catch {
        toast.error("Failed to delete workout log");
      }
    },
    [fetchHistory]
  );

  return {
    history,
    isLoadingHistory,
    fetchHistory,
    handleDeleteLog,
  };
}
