import React from "react";
import { ShieldAlert } from "lucide-react";

export function CoachDisclaimer() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-amber-300 shrink-0 shadow-xs">
      <ShieldAlert className="size-4 shrink-0 text-amber-400" />
      <p className="leading-snug text-[11px] sm:text-xs">
        <strong className="text-amber-200">Physician & Safety Notice:</strong> AI Coach provides precision algorithmic workout & nutrition telemetry. Not a substitute for professional medical prescription or clinical physical therapy.
      </p>
    </div>
  );
}
