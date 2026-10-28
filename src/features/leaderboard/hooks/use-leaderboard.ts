"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { LeaderboardApiResponse } from "@/lib/leaderboard/types";
import { UpdateLeaderboardPreferencesInput } from "@/validators/leaderboard.validator";

export interface UserPreferencesData {
  optIn: boolean;
  displayName: string;
  weeklyWorkoutGoal: number;
  dailyProteinTarget: number;
  dailyHydrationTarget: number;
  pendingWeeklyWorkoutGoal?: number;
  pendingDailyProteinTarget?: number;
  pendingDailyHydrationTarget?: number;
  pendingGoalsEffectiveWeekStart?: string;
}

export function useLeaderboard() {
  const [period, setPeriod] = useState<"current" | "previous">("current");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);

  const [data, setData] = useState<LeaderboardApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<UserPreferencesData | null>(null);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState<boolean>(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Manual or programmatic re-fetch
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<LeaderboardApiResponse>(
        `/api/leaderboard?period=${period}&page=${page}&limit=${limit}&_t=${Date.now()}`
      );
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || "Failed to load leaderboard data");
      }
    } catch (err) {
      setError((err as Error).message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [period, page, limit]);

  const { isAuthenticated } = useAuth();

  // Manual or programmatic preference fetch
  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingPrefs(true);
    try {
      const res = await apiClient<UserPreferencesData>(`/api/leaderboard/preferences?_t=${Date.now()}`);
      if (res.success && res.data) {
        setPreferences(res.data);
      }
    } catch {
      // safe fallback
    } finally {
      setIsLoadingPrefs(false);
    }
  }, [isAuthenticated]);

  // Primary data load effect
  useEffect(() => {
    let isMounted = true;
    apiClient<LeaderboardApiResponse>(
      `/api/leaderboard?period=${period}&page=${page}&limit=${limit}&_t=${Date.now()}`
    )
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setData(res.data);
          setError(null);
        } else {
          setError(res.message || "Failed to load leaderboard data");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError((err as Error).message || "An unexpected error occurred");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [period, page, limit]);

  // Initial preferences load effect
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    apiClient<UserPreferencesData>(`/api/leaderboard/preferences?_t=${Date.now()}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setPreferences(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingPrefs(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // Update preferences
  const updatePreferences = async (input: UpdateLeaderboardPreferencesInput) => {
    setIsSavingPrefs(true);
    try {
      const res = await apiClient<UserPreferencesData>("/api/leaderboard/preferences", {
        method: "PATCH",
        body: JSON.stringify(input),
      });

      if (res.success && res.data) {
        setPreferences(res.data);
        toast.success(res.message || "Preferences updated");
        setIsSettingsOpen(false);
        // Refresh leaderboard to reflect new opt-in or display name immediately
        fetchLeaderboard();
        return true;
      } else {
        toast.error(res.message || "Failed to update preferences");
        return false;
      }
    } catch (err) {
      toast.error((err as Error).message || "Network error updating preferences");
      return false;
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return {
    period,
    setPeriod,
    page,
    setPage,
    data,
    isLoading,
    error,
    preferences,
    isLoadingPrefs,
    isSavingPrefs,
    isSettingsOpen,
    setIsSettingsOpen,
    fetchLeaderboard,
    fetchPreferences,
    updatePreferences,
  };
}
