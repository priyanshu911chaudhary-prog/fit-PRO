export interface BmiRecord {
  _id?: string;
  id?: string;
  weight: number;
  height: number;
  bmi: number;
  category: string;
  date?: string;
  createdAt?: string | Date;
}

export interface BmiChartPoint {
  date: string;
  bmi: number;
  weight: number;
  height: number;
  category: string;
}

export interface BmiDelta {
  weightDiff: number;
  bmiDiff: number;
  isWeightGain: boolean;
  isWeightEqual: boolean;
}

export type BmiChartMetric = "bmi" | "weight";
