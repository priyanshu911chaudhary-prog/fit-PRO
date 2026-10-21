"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { calculateBMI } from "@/lib/fitness-calc";
import type { BmiRecord, BmiChartMetric } from "../types";
import {
  calculateBmr,
  calculateSpectrumPercentage,
  formatChartData,
  calculateHistoryDelta,
  getCategoryBadgeColor,
} from "../lib/calculations";

export function useBmi() {
  const [history, setHistory] = useState<BmiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chartMetric, setChartMetric] = useState<BmiChartMetric>("bmi");

  // Form fields
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await apiClient<BmiRecord[] | { history?: BmiRecord[]; records?: BmiRecord[] }>("/api/bmi");
      const records = Array.isArray(res.data)
        ? res.data
        : Array.isArray((res.data as { history?: BmiRecord[] })?.history)
        ? (res.data as { history: BmiRecord[] }).history
        : Array.isArray((res.data as { records?: BmiRecord[] })?.records)
        ? (res.data as { records: BmiRecord[] }).records
        : [];

      if (res.success && records) {
        setHistory(records);
        if (records.length > 0) {
          const latest = records[0];
          if (latest.height) setHeight(latest.height);
          if (latest.weight) setWeight(latest.weight);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    apiClient<BmiRecord[] | { history?: BmiRecord[]; records?: BmiRecord[] }>("/api/bmi")
      .then((res) => {
        const records = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as { history?: BmiRecord[] })?.history)
          ? (res.data as { history: BmiRecord[] }).history
          : Array.isArray((res.data as { records?: BmiRecord[] })?.records)
          ? (res.data as { records: BmiRecord[] }).records
          : [];

        if (isMounted && res.success && records) {
          setHistory(records);
          if (records.length > 0) {
            const latest = records[0];
            if (latest.height) setHeight(latest.height);
            if (latest.weight) setWeight(latest.weight);
          }
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

  // Live calculation preview
  const liveBMI = useMemo(() => calculateBMI(weight, height), [weight, height]);

  // Mifflin-St Jeor estimated BMR reference (using male baseline default)
  const estBmr = useMemo(() => calculateBmr(weight, height), [weight, height]);

  // Marker percentage on WHO spectrum (15 to 35 range)
  const spectrumPct = useMemo(
    () => calculateSpectrumPercentage(liveBMI.bmi),
    [liveBMI.bmi]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (weight < 20 || weight > 300) {
        toast.error("Weight must be between 20 and 300 kg.");
        return;
      }
      if (height < 50 || height > 250) {
        toast.error("Height must be between 50 and 250 cm.");
        return;
      }

      try {
        setIsSubmitting(true);
        const res = await apiClient("/api/bmi", {
          method: "POST",
          body: JSON.stringify({
            weight: Number(weight),
            height: Number(height),
          }),
        });

        if (res.success) {
          toast.success("Anthropometric measurement logged!", {
            description: `Recorded ${weight} kg • ${liveBMI.bmi} BMI (${liveBMI.category})`,
          });
          await fetchHistory();
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { message?: string } })?.response?.message ||
          (err as Error).message ||
          "Failed to log BMI record";
        toast.error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [weight, height, liveBMI.bmi, liveBMI.category, fetchHistory]
  );

  const chartData = useMemo(() => formatChartData(history), [history]);
  const historyDelta = useMemo(() => calculateHistoryDelta(chartData), [chartData]);
  const categoryColor = useMemo(
    () => getCategoryBadgeColor(liveBMI.category),
    [liveBMI.category]
  );

  return {
    history,
    isLoading,
    isSubmitting,
    chartMetric,
    setChartMetric,
    weight,
    setWeight,
    height,
    setHeight,
    liveBMI,
    estBmr,
    spectrumPct,
    chartData,
    historyDelta,
    categoryColor,
    handleSubmit,
    fetchHistory,
  };
}
