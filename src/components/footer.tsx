"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  Loader2,
  HeartPulse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { toast } from "sonner";

export function Footer() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  if (pathname === "/coach") {
    return null;
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubscribing(true);
    await new Promise((r) => setTimeout(r, 600));
    setIsSubscribing(false);
    toast.success("Welcome to the Athlete Dispatch. Training updates incoming.");
    setEmail("");
  };

  return (
    <footer className="relative border-t border-border/60 bg-background text-foreground overflow-hidden">
      {/* Massive Editorial Watermark in Background */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/4 pointer-events-none select-none text-[18vw] font-black tracking-tighter text-foreground/[0.02] dark:text-foreground/[0.04] whitespace-nowrap leading-none z-0"
      >
        fit-PRO
      </div>

      <div className="relative z-10 container mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8">
        {/* Top Strip: Brand & Newsletter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-12 border-b border-border/40">
          <div className="space-y-3 max-w-lg">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-card border border-border/80 text-emerald-400 shadow-xs">
                <FitProLogo size={22} />
              </div>
              <span className="font-heading text-xl font-black tracking-tight text-foreground">
                fit-PRO
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Adaptive Fitness
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Personalized workout programming, macronutrient tracking, and real-time AI guidance designed to help athletes train with clarity and intent.
            </p>
          </div>

          {/* Athlete Dispatch Input */}
          <div className="w-full lg:max-w-md space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Athlete Dispatch & Training Protocols
            </span>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <Input
                type="email"
                placeholder="athlete@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card/50 border-border/80 text-sm h-10 focus-visible:ring-emerald-500/40"
              />
              <Button
                type="submit"
                disabled={isSubscribing}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-10 px-4 shrink-0 shadow-sm shadow-emerald-500/20"
              >
                {isSubscribing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    Join
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground">
              Science-backed workout adjustments, nutritional tips, and zero spam.
            </p>
          </div>
        </div>

        {/* 4-Column Navigation Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
          {/* Col 1: Platform Features */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Features
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/workout" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Workout Tracker</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/meal" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Macro & Meal Planner</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/water" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Hydration Tracking</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/bmi" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Biometrics & Body Mass</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/coach" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>AI Coaching Assistant</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Training Splits */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Programs
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/plans" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>3-Day Hypertrophy Split</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/plans" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Push / Pull / Legs</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/plans" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Strength & Conditioning</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/plans" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Caloric Deficit Protocol</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Athlete Tools */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Athlete Tools
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Athlete Dashboard</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/bmi" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>BMR & TDEE Calculator</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/workout" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Progressive Overload Log</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="transition-colors hover:text-emerald-400 flex items-center gap-1 group">
                  <span>Baseline Calibration</span>
                  <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Redesigned Medical & Safety Card */}
          <div className="col-span-2 md:col-span-1 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Health & Safety
            </h4>
            <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm p-4 space-y-3 transition-colors hover:border-emerald-500/30 shadow-xs">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <div className="size-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <HeartPulse className="size-3.5" />
                </div>
                <span>Medical Guidance</span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                All workout routines, caloric targets, and AI coaching suggestions are designed for fitness education. Always consult a certified healthcare professional before beginning any intensive training program.
              </p>
              <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                <ShieldCheck className="size-3.5" />
                <span>Physician Consultation Advised</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Compliance */}
        <div className="pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© 2026 fit-PRO. All rights reserved.</span>
            <span>•</span>
            <span>Built for dedicated athletes</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/coach" className="hover:text-foreground transition-colors">
              AI Safety Guidelines
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
