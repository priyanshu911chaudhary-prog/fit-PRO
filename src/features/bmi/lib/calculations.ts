import type { BmiRecord, BmiChartPoint, BmiDelta } from "../types";

export function calculateBmr(weight: number, height: number): number {
  return Math.round(10 * weight + 6.25 * height - 5 * 26 + 5);
}

export function calculateSpectrumPercentage(bmi: number): number {
  return Math.min(100, Math.max(0, ((bmi - 15) / (35 - 15)) * 100));
}

export function formatChartData(history: BmiRecord[]): BmiChartPoint[] {
  return [...history].reverse().map((item) => {
    const rawDate = item.date || item.createdAt;
    let displayDate = "Entry";
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        displayDate = parsed.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        displayDate = String(rawDate);
      }
    }
    return {
      date: displayDate,
      bmi: item.bmi,
      weight: item.weight,
      height: item.height,
      category: item.category,
    };
  });
}

export function calculateHistoryDelta(chartData: BmiChartPoint[]): BmiDelta | null {
  if (chartData.length < 2) return null;
  const first = chartData[0];
  const latest = chartData[chartData.length - 1];
  const weightDiff = Number((latest.weight - first.weight).toFixed(1));
  const bmiDiff = Number((latest.bmi - first.bmi).toFixed(1));
  return {
    weightDiff,
    bmiDiff,
    isWeightGain: weightDiff > 0,
    isWeightEqual: weightDiff === 0,
  };
}

export function getCategoryBadgeColor(category: string): string {
  const map: Record<string, string> = {
    underweight: "border-cyan-500/40 text-cyan-400 bg-cyan-500/10",
    normal: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    overweight: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    obese: "border-rose-500/40 text-rose-400 bg-rose-500/10",
  };
  return map[category.toLowerCase()] || "border-emerald-500/40 text-emerald-400 bg-emerald-500/10";
}
