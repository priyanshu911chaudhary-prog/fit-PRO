import React, { Suspense } from "react";
import { WaterPageContent } from "@/features/water/components/water-page-content";

export default function WaterPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-5xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <WaterPageContent />
    </Suspense>
  );
}
