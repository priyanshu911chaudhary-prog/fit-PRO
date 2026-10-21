import React from "react";
import Link from "next/link";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import type { AuthMode } from "../types";

interface AuthCardHeaderProps {
  mode: AuthMode;
}

export function AuthCardHeader({ mode }: AuthCardHeaderProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-2">
      <Link
        href="/"
        className="flex size-11 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-xs hover:border-emerald-500/40 hover:scale-105 transition-all duration-200"
      >
        <FitProLogo size={24} />
      </Link>
      <div className="space-y-0.5">
        <h1 className="font-heading text-xl font-black tracking-tight text-foreground">
          fit-PRO
        </h1>
        <p className="text-xs text-muted-foreground">
          {mode === "login"
            ? "Welcome back. Access your athletic telemetry."
            : "Join fit-PRO. Forge your training protocol."}
        </p>
      </div>
    </div>
  );
}
