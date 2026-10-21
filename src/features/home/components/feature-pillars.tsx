"use client";

import React from "react";
import { Dumbbell, Utensils, HeartPulse } from "lucide-react";

export function FeaturePillars() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8 border-t border-border/40 bg-card/20">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-left md:text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Everything You Need To Elevate Your Fitness
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Built with obsessive focus on athletic progress, progressive overload, and dietary
            adherence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-6 space-y-3 hover:border-emerald-500/40 transition-colors shadow-sm">
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 w-fit">
              <Dumbbell className="size-5" />
            </div>
            <h3 className="font-bold text-lg">Custom Workout Routines</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              3-day customized splits matching your equipment, recovery capacity, and target
              muscle groups with progressive overload built-in.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-6 space-y-3 hover:border-cyan-500/40 transition-colors shadow-sm">
            <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 w-fit">
              <Utensils className="size-5" />
            </div>
            <h3 className="font-bold text-lg">Smart Macro Meal Plans</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Personalized nutrient plans calculated against your target TDEE, respecting dietary
              restrictions (vegan, keto, high-protein).
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/60 p-6 space-y-3 hover:border-purple-500/40 transition-colors shadow-sm">
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 w-fit">
              <HeartPulse className="size-5" />
            </div>
            <h3 className="font-bold text-lg">Adaptive AI Guidance</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time feedback on exercise technique, recovery optimization, and nutritional timing
              as your metrics evolve week over week.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
