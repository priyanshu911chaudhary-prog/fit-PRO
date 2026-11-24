import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import type { PlanType } from "../types";

interface PlansHeaderProps {
  planType: PlanType;
  isGeneratingWorkout: boolean;
  isGeneratingMeal: boolean;
  onGenerateWorkout: () => void;
  onGenerateMeal: () => void;
}

export function PlansHeader({
  planType,
  isGeneratingWorkout,
  isGeneratingMeal,
  onGenerateWorkout,
  onGenerateMeal,
}: PlansHeaderProps) {
  const workout = planType === "workout";
  const pending = workout ? isGeneratingWorkout : isGeneratingMeal;
  return <PageHeading title="Your plans" description="Generate and review meal and workout plans based on your profile.">
    <Button id={workout ? "generate-workout-plan-btn" : "generate-meal-plan-btn"} disabled={pending}
      onClick={workout ? onGenerateWorkout : onGenerateMeal}>
      {pending ? "Generating…" : workout ? "Generate workout plan" : "Generate meal plan"}
    </Button>
  </PageHeading>;
}
