"use client";

import React from "react";
import { Crown, Medal, Award, Flame } from "lucide-react";
import { LeaderboardParticipantRank } from "@/lib/leaderboard/types";

interface LeaderboardPodiumProps {
  podium: LeaderboardParticipantRank[];
}

export function LeaderboardPodium({ podium }: LeaderboardPodiumProps) {
  if (podium.length === 0) return null;

  // Group podium participants by rank
  const rank1s = podium.filter((p) => p.rank === 1);
  const rank2s = podium.filter((p) => p.rank === 2);
  const rank3s = podium.filter((p) => p.rank === 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Flame className="size-4 text-amber-500" />
        <h2 className="text-xs uppercase tracking-widest font-mono text-muted-foreground font-semibold">
          Podium Standings
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        {/* Silver (Rank 2) - Left */}
        <div className="order-2 md:order-1">
          {rank2s.length > 0 ? (
            <div className="space-y-3">
              {rank2s.map((p) => (
                <div
                  key={p.userId}
                  className="relative p-5 rounded-2xl bg-card/70 border border-slate-400/30 backdrop-blur-md shadow-lg flex flex-col items-center text-center group hover:border-slate-300/50 transition-all"
                >
                  <div className="size-10 rounded-full bg-slate-400/10 border border-slate-400/30 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
                    <Medal className="size-5 text-slate-300" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-mono text-slate-400 font-semibold mb-1">
                    Rank #2 {rank2s.length > 1 ? "(Tied)" : ""}
                  </span>
                  <h3 className="font-bold text-base text-foreground truncate max-w-full">
                    {p.displayName}
                  </h3>
                  <div className="mt-3 inline-flex items-baseline gap-1 px-3 py-1 rounded-full bg-slate-400/10 border border-slate-400/20">
                    <span className="text-lg font-mono font-bold text-slate-200">
                      {p.displayScore.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">pts</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-border/50 text-center text-xs text-muted-foreground/60 font-mono">
              Position Open
            </div>
          )}
        </div>

        {/* Gold (Rank 1) - Center & Prominent */}
        <div className="order-1 md:order-2">
          {rank1s.length > 0 ? (
            <div className="space-y-3">
              {rank1s.map((p) => (
                <div
                  key={p.userId}
                  className="relative p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 via-card/80 to-card/90 border-2 border-amber-500/50 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center transform md:-translate-y-2 group hover:border-amber-400 transition-all"
                >
                  <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 text-[10px] font-bold font-mono tracking-wider uppercase shadow-md flex items-center gap-1">
                    <Crown className="size-3 fill-amber-950" />
                    {rank1s.length > 1 ? "Co-Leader" : "Champion"}
                  </div>

                  <div className="size-14 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
                    <Crown className="size-7 text-amber-400" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-mono text-amber-400/90 font-bold mb-1">
                    Rank #1 {rank1s.length > 1 ? "(Tied)" : ""}
                  </span>
                  <h3 className="font-bold text-lg text-foreground truncate max-w-full">
                    {p.displayName}
                  </h3>
                  <div className="mt-3 inline-flex items-baseline gap-1 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                    <span className="text-2xl font-mono font-extrabold text-amber-400">
                      {p.displayScore.toFixed(2)}
                    </span>
                    <span className="text-xs text-amber-300/80 font-mono">pts</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-amber-500/30 text-center text-xs text-muted-foreground/60 font-mono">
              Leader Spot Open
            </div>
          )}
        </div>

        {/* Bronze (Rank 3) - Right */}
        <div className="order-3 md:order-3">
          {rank3s.length > 0 ? (
            <div className="space-y-3">
              {rank3s.map((p) => (
                <div
                  key={p.userId}
                  className="relative p-5 rounded-2xl bg-card/70 border border-amber-700/30 backdrop-blur-md shadow-lg flex flex-col items-center text-center group hover:border-amber-600/50 transition-all"
                >
                  <div className="size-10 rounded-full bg-amber-700/10 border border-amber-700/30 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
                    <Award className="size-5 text-amber-600" />
                  </div>
                  <span className="text-xs uppercase tracking-wider font-mono text-amber-600 font-semibold mb-1">
                    Rank #3 {rank3s.length > 1 ? "(Tied)" : ""}
                  </span>
                  <h3 className="font-bold text-base text-foreground truncate max-w-full">
                    {p.displayName}
                  </h3>
                  <div className="mt-3 inline-flex items-baseline gap-1 px-3 py-1 rounded-full bg-amber-700/10 border border-amber-700/20">
                    <span className="text-lg font-mono font-bold text-amber-500">
                      {p.displayScore.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">pts</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-dashed border-border/50 text-center text-xs text-muted-foreground/60 font-mono">
              Position Open
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
