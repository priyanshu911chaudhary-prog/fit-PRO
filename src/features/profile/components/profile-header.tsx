"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

export function ProfileHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="size-3.5" />
              ATHLETE BIO-PASSPORT
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              METABOLIC ENGINE SYNCED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Athlete Profile & Biometrics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure baseline anthropometrics, active energy expenditure multipliers, and workout gear.
          </p>
        </div>
      </div>
    </div>
  );
}
