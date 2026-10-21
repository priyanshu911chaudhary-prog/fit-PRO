"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Utensils,
  Scale,
  Droplet,
  Flame,
  CalendarCheck,
  Bot,
  Sparkles,
  Zap,
  Plus,
} from "lucide-react";
import { AiPromptItem } from "../types";
import { cn } from "cn";

interface BentoGridProps {
  calcWeight: number;
  setCalcWeight: (val: number) => void;
  calcHeight: number;
  setCalcHeight: (val: number) => void;
  computedBmi: number;
  computedCategory: string;
  estimatedTdee: number;
  waterMl: number;
  waterTarget: number;
  addWater: () => void;
  completedSets: number[];
  toggleSet: (setNumber: number) => void;
  activePromptIndex: number;
  setActivePromptIndex: (idx: number) => void;
  aiPrompts: AiPromptItem[];
}

export function BentoGrid({
  calcWeight,
  setCalcWeight,
  calcHeight,
  setCalcHeight,
  computedBmi,
  computedCategory,
  estimatedTdee,
  waterMl,
  waterTarget,
  addWater,
  completedSets,
  toggleSet,
  activePromptIndex,
  setActivePromptIndex,
  aiPrompts,
}: BentoGridProps) {
  return (
    <section className="px-4 pb-28 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      <div className="text-left md:text-center pb-10 space-y-2">
        <p className="text-xs uppercase tracking-widest font-bold text-emerald-400">
          Interactive System Previews
        </p>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
          The Athlete Operating System
        </h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Test and interact with the core features live right on this page before signing up.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Bento Cell 1: Workout Tracking & Progressive Overload (Span 7) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="md:col-span-7 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors"
        >
          <div>
            <div className="flex items-center justify-between pb-5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs">
                  <Dumbbell className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Workout Tracker & Overload
                  </h3>
                  <p className="text-xs text-muted-foreground">Day 1 • Push Hypertrophy Split</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Est. Volume: 3,420 kg
                </span>
              </div>
            </div>

            {/* Set Logging Table with Interactive Checkmarks */}
            <div className="pt-4 space-y-2.5">
              <div className="text-xs font-semibold text-muted-foreground flex justify-between px-1">
                <span>Exercise: Incline Dumbbell Press</span>
                <span className="text-emerald-400 font-mono">3 Sets Target</span>
              </div>

              {[
                { set: 1, weight: "32 kg", reps: "10 reps", rpe: "@ RPE 8" },
                { set: 2, weight: "34 kg", reps: "8 reps", rpe: "@ RPE 8.5" },
                { set: 3, weight: "34 kg", reps: "8 reps", rpe: "@ RPE 9" },
              ].map((item) => {
                const isDone = completedSets.includes(item.set);
                return (
                  <div
                    key={item.set}
                    onClick={() => toggleSet(item.set)}
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                      isDone
                        ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                        : "border-border/60 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "size-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors",
                          isDone
                            ? "bg-emerald-500 text-black shadow-xs"
                            : "border border-border/80 text-muted-foreground"
                        )}
                      >
                        {isDone ? "✓" : item.set}
                      </div>
                      <span className="text-xs font-bold text-foreground">Set {item.set}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span>{item.weight}</span>
                      <span>×</span>
                      <span>{item.reps}</span>
                      <span className="text-muted-foreground text-[11px]">{item.rpe}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>Click any set to mark completion</span>
            <span className="font-semibold text-emerald-400">
              {completedSets.length}/3 sets recorded
            </span>
          </div>
        </motion.div>

        {/* Bento Cell 2: Nutrition & Macro Planner (Span 5) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="md:col-span-5 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-xl group hover:border-cyan-500/40 transition-colors"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-xs">
                  <Utensils className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Macronutrient Target</h3>
                  <p className="text-xs text-muted-foreground">Daily Caloric Budget</p>
                </div>
              </div>
              <span className="text-xs font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                2,450 kcal
              </span>
            </div>

            {/* Macro Gauges */}
            <div className="space-y-3 pt-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Protein (Muscle Repair)</span>
                  <span className="font-mono text-emerald-400 font-bold">165g / 180g (92%)</span>
                </div>
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[92%] rounded-full" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Carbs (Glycogen Energy)</span>
                  <span className="font-mono text-cyan-400 font-bold">220g / 260g (85%)</span>
                </div>
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full w-[85%] rounded-full" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Healthy Fats (Hormone Health)</span>
                  <span className="font-mono text-amber-400 font-bold">54g / 65g (83%)</span>
                </div>
                <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full w-[83%] rounded-full" />
                </div>
              </div>
            </div>

            {/* Sample logged items preview */}
            <div className="pt-4 space-y-1.5">
              <div className="p-2 rounded-xl bg-background/50 border border-border/50 text-[11px] flex justify-between items-center">
                <span className="font-medium text-foreground">🍳 Oats, Whey & Blueberries</span>
                <span className="text-muted-foreground font-mono">520 kcal • 42g P</span>
              </div>
              <div className="p-2 rounded-xl bg-background/50 border border-border/50 text-[11px] flex justify-between items-center">
                <span className="font-medium text-foreground">🥗 Salmon & Quinoa Bowl</span>
                <span className="text-muted-foreground font-mono">680 kcal • 54g P</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between items-center">
            <span>Automatic BMR/TDEE calculation</span>
            <span className="font-semibold text-cyan-400">Balanced Split</span>
          </div>
        </motion.div>

        {/* Bento Cell 3: Interactive BMI & Baseline Calibration (Span 4) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="md:col-span-4 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-6 flex flex-col justify-between shadow-xl group hover:border-emerald-500/40 transition-colors"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs">
                  <Scale className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Biometrics</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                {computedCategory}
              </span>
            </div>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-bold text-foreground">{calcWeight} kg</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="140"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-muted rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-muted-foreground">Height</span>
                  <span className="font-bold text-foreground">{calcHeight} cm</span>
                </div>
                <input
                  type="range"
                  min="140"
                  max="210"
                  value={calcHeight}
                  onChange={(e) => setCalcHeight(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-muted rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1">
                <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground">BMI Score</div>
                  <div className="text-lg font-black text-emerald-400">{computedBmi}</div>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Daily TDEE</div>
                  <div className="text-lg font-black text-foreground">{estimatedTdee}</div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-3 border-t border-border/40 mt-3">
            Mifflin-St Jeor formula baseline
          </p>
        </motion.div>

        {/* Bento Cell 4: Hydration & Consistency Matrix (Span 4) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="md:col-span-4 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-6 flex flex-col justify-between shadow-xl group hover:border-cyan-500/40 transition-colors"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-xs">
                  <Droplet className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">Hydration Tracker</h3>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                <Flame className="size-3.5 fill-amber-400" />
                <span>14 Days</span>
              </div>
            </div>

            <div className="space-y-3.5 pt-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-black">
                    {waterMl}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / {waterTarget} ml
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-400 font-medium">
                    {Math.round((waterMl / waterTarget) * 100)}% of daily target reached
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addWater}
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="size-3" />
                  250 ml
                </button>
              </div>

              <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((waterMl / waterTarget) * 100, 100)}%` }}
                />
              </div>

              {/* 7-Day Matrix */}
              <div className="pt-1">
                <div className="flex justify-between items-center">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">{day}</span>
                      <span
                        className={cn(
                          "size-5 rounded-full flex items-center justify-center text-[9px] font-bold",
                          i < 6
                            ? "bg-cyan-400 text-black shadow-xs"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i < 6 ? "✓" : "•"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-3 border-t border-border/40 mt-3">
            Tap +250ml to simulate live intake log
          </p>
        </motion.div>

        {/* Bento Cell 5: 3-Day Workout Split Deck (Span 4) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="md:col-span-4 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-6 flex flex-col justify-between shadow-xl group hover:border-purple-500/40 transition-colors"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-xs">
                  <CalendarCheck className="size-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground">3-Day Plan Deck</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25">
                Hypertrophy
              </span>
            </div>

            <div className="space-y-2 pt-3">
              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-0.5">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>Day 1 • Push Focus</span>
                  <span className="text-emerald-400">Chest & Shoulders</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Incline DB Press, Overhead Press, Lateral Raises
                </p>
              </div>

              <div className="p-2.5 rounded-xl border border-border/60 bg-background/50 space-y-0.5">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>Day 2 • Pull Focus</span>
                  <span className="text-cyan-400">Lats & Biceps</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Weighted Pull-ups, Chest-Supported Row, Curls
                </p>
              </div>

              <div className="p-2.5 rounded-xl border border-border/60 bg-background/50 space-y-0.5">
                <div className="flex justify-between text-xs font-bold text-foreground">
                  <span>Day 3 • Leg Focus</span>
                  <span className="text-amber-400">Quads & Posterior</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Barbell Squat, Romanian Deadlift, Calf Raises
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-3 border-t border-border/40 mt-3">
            Auto-tailored to your available equipment
          </p>
        </motion.div>

        {/* Bento Cell 6: Gemini AI Coach With Rich Formatting (Span 12) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="md:col-span-12 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl p-6 sm:p-8 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-colors"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 gap-3 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-xs">
                <Bot className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Adaptive AI Fitness Coach</h3>
                <p className="text-xs text-muted-foreground">
                  Real-time conversational guidance tailored to your biometrics and progression
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/25 px-3 py-1 rounded-full font-medium">
              <Sparkles className="size-3.5" />
              <span>Interactive AI Consultation</span>
            </div>
          </div>

          {/* Prompt Selector Pills */}
          <div className="flex flex-wrap gap-2 py-5">
            {aiPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePromptIndex(idx)}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-xl border transition-all text-left font-semibold cursor-pointer",
                  activePromptIndex === idx
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-xs shadow-emerald-500/15"
                    : "border-border/60 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                )}
              >
                {p.q}
              </button>
            ))}
          </div>

          {/* Richly Formatted AI Response Message */}
          <div className="rounded-2xl border border-border/80 bg-background/80 p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-xs">
                  AI
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {aiPrompts[activePromptIndex].title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {aiPrompts[activePromptIndex].recommendation}
                  </p>
                </div>
              </div>

              {aiPrompts[activePromptIndex].macros && (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-card border border-border/60 text-emerald-400 font-bold">
                    {aiPrompts[activePromptIndex].macros?.kcal} kcal
                  </span>
                  <span className="px-2 py-0.5 rounded bg-card border border-border/60 text-foreground font-bold">
                    {aiPrompts[activePromptIndex].macros?.protein} Protein
                  </span>
                </div>
              )}
            </div>

            {/* Action Steps Checklist */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Prescribed Action Protocol
              </p>
              <div className="space-y-1.5">
                {aiPrompts[activePromptIndex].steps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                    <div className="size-4 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      {sIdx + 1}
                    </div>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coach Tip Callout */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-400">
              <Zap className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Coach Principle: </span>
                <span className="text-foreground/80">{aiPrompts[activePromptIndex].tip}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
