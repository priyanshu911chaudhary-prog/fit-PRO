export function computeBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const heightMeters = heightCm / 100;
  return +(weightKg / (heightMeters * heightMeters)).toFixed(1);
}

export function computeBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Optimal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function computeBmr(weightKg: number, heightCm: number, age: number = 26): number {
  // Mifflin-St Jeor formula
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

export function computeTdee(bmr: number, multiplier: number = 1.55): number {
  return Math.round(bmr * multiplier);
}
