import React from "react";
import Link from "next/link";
import {
  Dumbbell,
  Sparkles,
  Bot,
  Utensils,
  Droplet,
  Scale,
  ArrowRight,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

export default function HomePage() {
  return (
    <div className="flex flex-col flex-1 w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 md:pt-24 md:pb-32 sm:px-6 lg:px-8 overflow-hidden">
        {/* Glow gradients in background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/15 via-fuchsia-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 right-10 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-5xl text-center relative z-10 space-y-8">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 backdrop-blur-md shadow-xs animate-in fade-in slide-in-from-top-3 duration-500">
            <Sparkles className="size-3.5 text-indigo-400" />
            <span>Powered by Google Gemini 2.5 & Next.js Full-Stack</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Transform Your Fitness With{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
              Precision AI Coaching
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Generate custom workout splits, nutrient-balanced meal plans, track daily hydration,
            and chat real-time with an intelligent AI trainer built specifically for your goals.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full sm:w-auto px-8 h-12 text-base font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white shadow-lg shadow-indigo-500/25 border-0 transition-transform hover:scale-105"
              )}
            >
              Start Free Today
              <ArrowRight className="size-5 ml-2" />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "w-full sm:w-auto px-8 h-12 text-base font-semibold border-border/80 bg-background/50 hover:bg-muted/80 backdrop-blur-md"
              )}
            >
              Explore Dashboard
            </Link>
          </div>

          {/* Trust Highlights */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-500" />
              Dynamic Age & BMR Precision
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-indigo-500" />
              Live Streaming AI Coach
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-cyan-500" />
              Zero Stale Calculations
            </span>
          </div>
        </div>

        {/* Interactive Feature Preview Cards */}
        <div className="container mx-auto max-w-6xl mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {/* Card 1: AI Workout Plan Preview */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xl hover:border-indigo-500/40 transition-all hover:-translate-y-1">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Dumbbell className="size-5" />
                </div>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-bold text-indigo-400">
                  AI Plan
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Hypertrophy Split</h3>
                <p className="text-xs text-muted-foreground mt-1">4-Day Upper / Lower Adaptive Routine</p>
              </div>
              <div className="space-y-2 pt-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/40">
                  <span className="font-medium">Barbell Bench Press</span>
                  <span className="text-indigo-400 font-semibold">4 sets × 8-10 reps</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/40">
                  <span className="font-medium">Romanian Deadlift</span>
                  <span className="text-indigo-400 font-semibold">3 sets × 10 reps</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/40">
                  <span className="font-medium">Incline Dumbbell Curl</span>
                  <span className="text-indigo-400 font-semibold">3 sets × 12 reps</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: AI Coach Preview */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xl hover:border-fuchsia-500/40 transition-all hover:-translate-y-1">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-400">
                  <Bot className="size-5" />
                </div>
                <span className="rounded-full bg-fuchsia-500/10 px-2.5 py-0.5 text-[11px] font-bold text-fuchsia-400">
                  Live Coach
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Intelligent Dialogue</h3>
                <p className="text-xs text-muted-foreground mt-1">Gemini 2.5 streaming guidance</p>
              </div>
              <div className="space-y-2 pt-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5 text-muted-foreground">
                  <span className="font-semibold text-foreground">You: </span>
                  How can I increase pull-up strength safely?
                </div>
                <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-foreground leading-relaxed">
                  <span className="font-semibold text-indigo-400">Coach: </span>
                  Focus on eccentric negatives (3-5s descent) and scapular pull-ups twice weekly!
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Nutrition & Water Preview */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-xl hover:border-cyan-500/40 transition-all hover:-translate-y-1">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Flame className="size-5" />
                </div>
                <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-bold text-cyan-400">
                  Analytics
                </span>
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Daily Macros & Water</h3>
                <p className="text-xs text-muted-foreground mt-1">Accurate TDEE-aligned targets</p>
              </div>
              <div className="space-y-2.5 pt-2 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Calories (2,450 kcal)</span>
                    <span className="font-bold text-emerald-400">82%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[82%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Hydration (2,250 ml / 3,000 ml)</span>
                    <span className="font-bold text-cyan-400">75%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full w-[75%]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Feature Matrix */}
      <section className="border-t border-border/40 bg-muted/20 py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight">Everything You Need To Level Up</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
              Engineered with modern full-stack best practices: zero stale metrics, robust database schemas, and intelligent AI models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Dumbbell className="size-5" />
              </div>
              <h3 className="font-bold text-foreground">Workout Logging</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Log exercises with verified catalog items, set weights, and reps. Server-validated and indexed for rapid retrieval.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Utensils className="size-5" />
              </div>
              <h3 className="font-bold text-foreground">Nutritional Accuracy</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Server-side calorie and macro computation ensures exact nutrient numbers, preventing client manipulation.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Droplet className="size-5" />
              </div>
              <h3 className="font-bold text-foreground">Timezone Water Tracker</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Quick-add water buttons with IANA timezone awareness (`X-Timezone`), ensuring daily totals reset at your real local midnight.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/50 p-6 space-y-3">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Scale className="size-5" />
              </div>
              <h3 className="font-bold text-foreground">Dynamic BMR / TDEE</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Age is dynamically computed on read from date of birth. Boundary-accurate BMI categorization without mathematical gaps.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900/60 border border-indigo-500/30 p-8 sm:p-12 text-center space-y-6 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Ready to Upgrade Your Fitness?
            </h2>
            <p className="text-indigo-200/80 max-w-xl mx-auto text-sm sm:text-base">
              Get started with AI Fitness today and generate your customized workout and nutrition plan in seconds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-white text-indigo-950 hover:bg-zinc-100 font-bold px-8 shadow-lg shadow-black/20"
              )}
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-white/20 text-white hover:bg-white/10"
              )}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
