export const CIRCLE_RADIUS = 42;
export const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~263.89378

export interface HydrationStats {
  total: number;
  target: number;
  percentage: number;
  remaining: number;
  glasses: number;
  circumference: number;
  strokeDashoffset: number;
}

export function calculateHydrationStats(totalAmount = 0, targetAmount = 2500): HydrationStats {
  const total = totalAmount || 0;
  const target = targetAmount || 2500;
  const percentage = Math.min(Math.round((total / target) * 100), 100);
  const remaining = Math.max(0, target - total);
  const glasses = Math.round((total / 250) * 10) / 10;
  const strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * percentage) / 100;

  return {
    total,
    target,
    percentage,
    remaining,
    glasses,
    circumference: CIRCUMFERENCE,
    strokeDashoffset,
  };
}
