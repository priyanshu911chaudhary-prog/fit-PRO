import React from "react";
import { Droplet, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WaterHeaderProps {
  hasLogs: boolean;
  isSubmitting: boolean;
  onUndoLast: () => void;
}

export function WaterHeader({ hasLogs, isSubmitting, onUndoLast }: WaterHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Droplet className="size-3.5" />
              CELLULAR HYDRATION
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              LOCAL TIMEZONE SYNC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Hydration & Fluid Balance
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Intelligent volumetric tracking, real-time cellular hydration progress, and intake logging.
          </p>
        </div>

        {hasLogs && (
          <Button
            variant="outline"
            size="sm"
            id="water-undo-header-btn"
            disabled={isSubmitting}
            onClick={onUndoLast}
            className="border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-xs text-cyan-400 hover:text-cyan-300 font-medium h-9 px-3 cursor-pointer self-start md:self-auto"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Undo Last Log
          </Button>
        )}
      </div>
    </div>
  );
}
