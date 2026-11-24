import { Progress } from "@/components/ui/progress";

export function OnboardingHeader({ step }: { step: number }) {
  return <header className="space-y-3">
    <p className="text-sm text-muted-foreground">Step {step} of 4</p>
    <h1 className="font-serif text-3xl tracking-tight">Set up your journal</h1>
    <Progress value={step * 25} aria-label="Profile setup progress" />
  </header>;
}
