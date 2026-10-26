"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Medal, User as UserIcon } from "lucide-react";
import { LeaderboardParticipantRank } from "@/lib/leaderboard/types";
import { Button } from "@/components/ui/button";

interface LeaderboardTableProps {
  entries: LeaderboardParticipantRank[];
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export function LeaderboardTable({
  entries,
  page,
  totalPages,
  onPageChange,
  isLoading,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-card/60 border border-border/70 space-y-3">
        <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <Medal className="size-6 text-muted-foreground/60" />
        </div>
        <h3 className="font-semibold text-foreground text-base">No Ranked Participants Yet</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto font-mono">
          Be the first athlete to track 4 distinct days this week and claim the top of the leaderboard!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card/60 border border-border/80 backdrop-blur-xl shadow-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <th className="py-3.5 px-4 w-16 text-center">Rank</th>
              <th className="py-3.5 px-4">Athlete</th>
              <th className="py-3.5 px-4 text-right">Weekly Fit Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 text-sm">
            {entries.map((entry) => {
              const isTop3 = entry.rank <= 3;
              const isCurrentUser = entry.isCurrentUser;

              let rankBadgeClass = "bg-muted text-muted-foreground";
              if (entry.rank === 1) rankBadgeClass = "bg-amber-500/20 text-amber-400 border border-amber-500/40";
              else if (entry.rank === 2) rankBadgeClass = "bg-slate-400/20 text-slate-300 border border-slate-400/40";
              else if (entry.rank === 3) rankBadgeClass = "bg-amber-700/20 text-amber-500 border border-amber-700/40";

              return (
                <tr
                  key={entry.userId}
                  className={`transition-colors ${
                    isCurrentUser
                      ? "bg-primary/10 hover:bg-primary/15 font-medium"
                      : "hover:bg-muted/30"
                  }`}
                >
                  {/* Rank Badge */}
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center size-7 rounded-lg text-xs font-mono font-bold ${rankBadgeClass}`}
                    >
                      {entry.rank}
                    </span>
                  </td>

                  {/* Participant Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                        <UserIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-foreground truncate block">
                          {entry.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] uppercase font-mono tracking-wider text-primary font-bold">
                            (You)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Score */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex flex-col items-end">
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`font-mono font-bold text-base ${
                            isTop3 ? "text-amber-400" : "text-foreground"
                          }`}
                        >
                          {entry.displayScore.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">pts</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {entry.scoreBasisPoints} bps
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/60 bg-muted/20 text-xs font-mono text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
              className="size-8 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              className="size-8 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
