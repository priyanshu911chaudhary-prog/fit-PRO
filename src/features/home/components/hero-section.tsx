"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function HeroSection() {
  return (
    <section className="relative px-4 pt-16 pb-20 md:pt-28 md:pb-28 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-start md:items-center text-left md:text-center space-y-6"
      >
        {/* Athlete Focus Badge */}
        <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 backdrop-blur-md shadow-xs">
          <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Adaptive Training Engine • Precision Macro & Workout Splits</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] max-w-4xl">
          Train With Intent.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
            Measure With Certainty.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground font-normal leading-relaxed">
          Eliminate guesswork from your fitness. Fit-PRO calculates your exact metabolic caloric
          targets, generates custom 3-day workout routines, and provides real-time AI coaching
          personalized to your body.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4 w-full sm:w-auto">
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: "lg" }),
              "w-full sm:w-auto h-12 px-8 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            Start Free Training
            <ArrowRight className="size-4 ml-2" />
          </Link>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              "w-full sm:w-auto h-12 px-8 text-base font-semibold border-border/80 bg-card/60 hover:bg-muted hover:border-border text-foreground backdrop-blur-md transition-all"
            )}
          >
            Sign In to Dashboard
          </Link>
        </div>

        {/* Product Trust Value Props */}
        <div className="pt-4 flex flex-wrap items-center justify-start md:justify-center gap-6 text-xs text-muted-foreground font-medium">
          <div className="flex items-center gap-1.5">
            <Check className="size-4 text-emerald-400" />
            <span>Personalized 3-Day Workout Splits</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="size-4 text-emerald-400" />
            <span>Precise TDEE & Macronutrient Targets</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="size-4 text-emerald-400" />
            <span>Real-Time Adaptive AI Coach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="size-4 text-emerald-400" />
            <span>100% Free Baseline Calibration</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
