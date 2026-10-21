"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { STEPS } from "../lib/constants";
import { cn } from "cn";

interface OnboardingHeaderProps {
  step: number;
}

export function OnboardingHeader({ step }: OnboardingHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-card border border-border/80 text-emerald-400 shadow-xs">
            <FitProLogo size={20} />
          </div>
          <div>
            <span className="font-heading text-base font-black tracking-tight text-foreground">
              fit-PRO
            </span>
            <p className="text-[11px] text-muted-foreground font-mono">
              Calibration Protocol v2.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
          <Sparkles className="size-3" />
          <span>Step {step} of 4</span>
        </div>
      </div>

      {/* Connected Step Pills */}
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const isCurrent = step === s.number;
          const isCompleted = step > s.number;
          return (
            <div
              key={s.number}
              className={cn(
                "flex flex-col p-2.5 rounded-2xl border transition-all select-none",
                isCurrent
                  ? "border-emerald-500/40 bg-emerald-500/10 text-foreground shadow-xs shadow-emerald-500/10"
                  : isCompleted
                  ? "border-border/80 bg-muted/30 text-foreground"
                  : "border-border/40 bg-muted/10 text-muted-foreground/60"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold">0{s.number}</span>
                <div
                  className={cn(
                    "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                    isCompleted
                      ? "bg-emerald-500 text-black"
                      : isCurrent
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-muted/40 text-muted-foreground"
                  )}
                >
                  {isCompleted ? "✓" : s.number}
                </div>
              </div>
              <span className="text-xs font-bold mt-1 truncate">{s.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
