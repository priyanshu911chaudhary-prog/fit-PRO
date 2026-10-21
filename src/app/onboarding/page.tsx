import { Suspense } from "react";
import { OnboardingPageContent } from "@/features/onboarding/components/onboarding-page-content";

export default function OnboardingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background relative overflow-hidden">
      <Suspense
        fallback={
          <div className="w-full max-w-3xl h-[620px] rounded-3xl bg-card/40 border border-border/40 animate-pulse mx-auto" />
        }
      >
        <OnboardingPageContent />
      </Suspense>
    </div>
  );
}
