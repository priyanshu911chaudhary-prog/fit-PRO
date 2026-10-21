export interface WaterLog {
  _id: string;
  amountMl?: number;
  amount?: number;
  date?: string;
  createdAt?: string;
}

export interface TodayWaterResponse {
  totalAmount: number;
  targetAmount: number;
  percentage: number;
  logs: WaterLog[];
}

export interface VesselOption {
  amount: number;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}
