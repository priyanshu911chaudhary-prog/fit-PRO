"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FitProLogo } from "@/components/brand/fit-pro-logo";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client error in fit-PRO:", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl border border-rose-500/30 bg-[#0B0F0E]/85 backdrop-blur-2xl text-center space-y-6 shadow-2xl relative z-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertCircle className="size-8" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-rose-400 font-semibold">
            Telemetry Interrupted
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            System Error Encountered
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {error?.message || "An unexpected telemetry execution error occurred while loading this view."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="w-full sm:w-auto border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs h-9 px-4 cursor-pointer"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Recalibrate View
          </Button>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full bg-primary text-primary-foreground font-semibold text-xs h-9 px-4 shadow-md shadow-emerald-500/20 cursor-pointer">
              <Home className="size-3.5 mr-1.5" />
              Command Center
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
