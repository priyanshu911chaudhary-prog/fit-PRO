"use client";

import React from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingFooterProps {
  step: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function OnboardingFooter({
  step,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: OnboardingFooterProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/40">
      {step > 1 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={isSubmitting}
          className="border-border/80 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Back
        </Button>
      ) : (
        <div />
      )}

      {step < 4 ? (
        <Button
          type="button"
          size="sm"
          onClick={onNext}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold h-9 px-5 shadow-sm shadow-emerald-500/20 cursor-pointer"
        >
          Continue
          <ArrowRight className="size-3.5 ml-1.5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={isSubmitting}
          onClick={onSubmit}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-black h-10 px-6 shadow-md shadow-emerald-500/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Calibrating Protocol...
            </>
          ) : (
            <>
              Launch Athlete Dashboard
              <CheckCircle2 className="size-4 ml-2" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
