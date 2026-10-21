import React from "react";
import { motion } from "framer-motion";
import { cn } from "cn";
import type { AuthMode } from "../types";

interface AuthModeTabsProps {
  mode: AuthMode;
  onSwitchMode: (mode: AuthMode) => void;
}

export function AuthModeTabs({ mode, onSwitchMode }: AuthModeTabsProps) {
  return (
    <div className="grid grid-cols-2 p-1 bg-muted/40 border border-border/60 rounded-xl relative select-none">
      <button
        type="button"
        onClick={() => onSwitchMode("login")}
        className={cn(
          "relative z-10 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
          mode === "login"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {mode === "login" && (
          <motion.span
            layoutId="auth-tab-pill"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
            className="absolute inset-0 bg-background dark:bg-card rounded-lg border border-border/80 shadow-xs -z-10"
          />
        )}
        Sign In
      </button>

      <button
        type="button"
        onClick={() => onSwitchMode("register")}
        className={cn(
          "relative z-10 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
          mode === "register"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {mode === "register" && (
          <motion.span
            layoutId="auth-tab-pill"
            transition={{ type: "spring", stiffness: 450, damping: 35 }}
            className="absolute inset-0 bg-background dark:bg-card rounded-lg border border-border/80 shadow-xs -z-10"
          />
        )}
        Create Account
      </button>
    </div>
  );
}
