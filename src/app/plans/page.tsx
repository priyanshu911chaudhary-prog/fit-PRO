import React, { Suspense } from "react";
import { PlansPageContent } from "@/features/plans/components/plans-page-content";

export default function PlansPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <PlansPageContent />
    </Suspense>
  );
}
