"use client";

import React from "react";
import { useWater } from "../hooks/use-water";
import { WaterHeader } from "./water-header";
import { WaterRadialHero } from "./water-radial-hero";
import { WaterIntakeLog } from "./water-intake-log";

export function WaterPageContent() {
  const {
    data,
    stats,
    isLoading,
    isSubmitting,
    customAmount,
    setCustomAmount,
    handleAddWater,
    handleDelete,
    handleUndoLast,
  } = useWater();

  const logs = data?.logs || [];
  const hasLogs = logs.length > 0;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <WaterHeader
        hasLogs={hasLogs}
        isSubmitting={isSubmitting}
        onUndoLast={handleUndoLast}
      />

      <WaterRadialHero
        stats={stats}
        isSubmitting={isSubmitting}
        hasLogs={hasLogs}
        customAmount={customAmount}
        onCustomAmountChange={setCustomAmount}
        onAddWater={handleAddWater}
        onUndoLast={handleUndoLast}
      />

      <WaterIntakeLog
        logs={logs}
        isLoading={isLoading}
        onDelete={handleDelete}
      />
    </div>
  );
}
