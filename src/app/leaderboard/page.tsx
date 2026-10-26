import React, { Suspense } from "react";
import { Metadata } from "next";
import { LeaderboardPageContent } from "@/features/leaderboard/components/leaderboard-page-content";

export const metadata: Metadata = {
  title: "Weekly Leaderboard | Fit-PRO",
  description: "Track your global weekly fitness score, compete with peers, and climb the podium.",
};

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-2xl bg-card/60 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <LeaderboardPageContent />
    </Suspense>
  );
}
