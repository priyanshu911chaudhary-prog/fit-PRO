"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { useHomeSimulators } from "../hooks/use-home-simulators";
import { HeroSection } from "./hero-section";
import { BentoGrid } from "./bento-grid";
import { FeaturePillars } from "./feature-pillars";
import { CtaSection } from "./cta-section";

export function HomePageContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const dest = user.hasProfile ? "/dashboard" : "/onboarding";
      router.replace(dest);
    }
  }, [isLoading, isAuthenticated, user, router]);

  const simulators = useHomeSimulators();

  if (!isLoading && isAuthenticated && user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse text-emerald-400 shadow-lg shadow-emerald-500/10">
          <FitProLogo size={24} />
        </div>
        <p className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
          Routing to Command Center...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full bg-background text-foreground overflow-hidden">
      {/* Background Ambient Athletic Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none opacity-30 blur-[140px] -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/30 via-cyan-500/10 to-transparent" />

      <HeroSection />
      <BentoGrid {...simulators} />
      <FeaturePillars />
      <CtaSection />
    </div>
  );
}
