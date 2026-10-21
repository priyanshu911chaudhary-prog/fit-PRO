import React from "react";
import { Scale } from "lucide-react";
import type { BmiDelta } from "../types";

interface BmiHeaderProps {
  historyDelta: BmiDelta | null;
}

export function BmiHeader({ historyDelta }: BmiHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <Scale className="size-3.5" />
              ANTHROPOMETRIC ENGINE
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              CALIBRATION ACTIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Biometric Telemetry & Anthropometrics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Precision body mass index trajectory, WHO classification spectrum, and historical composition tracking.
          </p>
        </div>

        {historyDelta && (
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="rounded-xl border border-border/70 bg-card/40 px-3.5 py-2 text-xs font-mono">
              <div className="text-muted-foreground text-[10px]">Net Trajectory</div>
              <div className="font-bold text-foreground">
                <span className={historyDelta.isWeightGain ? "text-amber-400" : "text-emerald-400"}>
                  {historyDelta.weightDiff > 0 ? `+${historyDelta.weightDiff}` : historyDelta.weightDiff} kg
                </span>
                <span className="text-muted-foreground ml-1.5">
                  ({historyDelta.bmiDiff > 0 ? `+${historyDelta.bmiDiff}` : historyDelta.bmiDiff} BMI)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
