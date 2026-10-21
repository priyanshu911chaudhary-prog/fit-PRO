import { ChartMetric, DashboardStats, MetricDelta, TimeRange } from "../types";

export function formatSafeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function filterChartData(
  history: DashboardStats["weightHistory"] | undefined,
  timeRange: TimeRange
): DashboardStats["weightHistory"] {
  if (!history || history.length === 0) return [];
  if (timeRange === "7d") return history.slice(-7);
  if (timeRange === "30d") return history.slice(-30);
  return history;
}

export function calculateMetricDelta(
  data: DashboardStats["weightHistory"],
  chartMetric: ChartMetric
): MetricDelta | null {
  if (!data || data.length < 2) return null;
  const first = data[0][chartMetric];
  const last = data[data.length - 1][chartMetric];
  const diff = Number((last - first).toFixed(1));
  return {
    diff,
    isPositive: diff > 0,
    isZero: diff === 0,
    unit: chartMetric === "weight" ? "kg" : "pts",
  };
}
