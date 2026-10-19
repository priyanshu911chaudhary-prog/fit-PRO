import React from "react";
import Link from "next/link";
import { Dumbbell, ShieldAlert, HeartHandshake } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-card/40 backdrop-blur-xs">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 shadow-sm">
                <Dumbbell className="size-4 text-white" />
              </div>
              <span className="font-heading text-lg font-bold tracking-tight">AI Fitness</span>
            </div>
            <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
              Your personalized, AI-driven fitness companion. Precision workout generation,
              adaptive meal planning, intelligent hydration monitoring, and 24/7 intelligent coaching.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HeartHandshake className="size-4 text-rose-500" />
              <span>Built with Google Gemini AI & Next.js</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wide text-foreground">Navigation</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/dashboard" className="transition-colors hover:text-foreground">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/workout" className="transition-colors hover:text-foreground">
                  Workouts
                </Link>
              </li>
              <li>
                <Link href="/meal" className="transition-colors hover:text-foreground">
                  Nutrition
                </Link>
              </li>
              <li>
                <Link href="/bmi" className="transition-colors hover:text-foreground">
                  BMI & Analytics
                </Link>
              </li>
              <li>
                <Link href="/coach" className="transition-colors hover:text-foreground">
                  AI Coach
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal / Medical Notice */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wide text-foreground">Health & Safety</h4>
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-500/90 dark:text-amber-400">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Medical Disclaimer: All workouts and meal suggestions are AI-generated for informational guidance only. Always consult a physician before starting any training or dietary program.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
          <p>© 2026 AI Fitness. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/coach" className="hover:text-foreground transition-colors">AI Health Guidelines</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
