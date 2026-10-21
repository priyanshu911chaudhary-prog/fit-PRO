"use client";

import React from "react";
import Link from "next/link";
import { Zap, Dumbbell, Utensils, Calendar, ChevronRight, Droplet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TacticalLaunchpadProps {
  waterTotalMl?: number;
  addingWater: boolean;
  onQuickAddWater: (ml: number) => void;
}

export function TacticalLaunchpad({
  waterTotalMl = 0,
  addingWater,
  onQuickAddWater,
}: TacticalLaunchpadProps) {
  return (
    <div className="lg:col-span-4 space-y-4">
      <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Zap className="size-4 text-emerald-400" />
              Tactical Launchpad
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-emerald-500/20 text-emerald-400 bg-emerald-500/10"
            >
              READY
            </Badge>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Rapid operational logging & protocol generation
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pt-4">
          {/* Module 1: Workout Session */}
          <Link
            href="/workout"
            className="group flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/40 hover:bg-emerald-500/5 hover:border-emerald-500/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Dumbbell className="size-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground group-hover:text-emerald-400 transition-colors">
                  Log Workout Session
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Sets, reps, intensity & load
                </div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Module 2: Meal & Macros */}
          <Link
            href="/meal"
            className="group flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/40 hover:bg-cyan-500/5 hover:border-cyan-500/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Utensils className="size-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                  Log Meal & Macros
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Caloric budget & protein breakdown
                </div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Module 3: 3-Day Adaptive Plans */}
          <Link
            href="/plans"
            className="group flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/40 hover:bg-purple-500/5 hover:border-purple-500/40 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Calendar className="size-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground group-hover:text-purple-400 transition-colors">
                  3-Day AI Plans
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Algorithmic training & rest splits
                </div>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </Link>

          {/* Module 4: Quick Water Boost */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-card/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="size-4 text-cyan-400" />
                <span className="text-xs font-semibold text-foreground">
                  Rapid Hydration Boost
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                {waterTotalMl} ml
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                disabled={addingWater}
                onClick={() => onQuickAddWater(250)}
                className="h-8 text-xs font-medium border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer"
              >
                +250 ml
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={addingWater}
                onClick={() => onQuickAddWater(500)}
                className="h-8 text-xs font-medium border-cyan-500/30 hover:bg-cyan-500/10 hover:border-cyan-500/50 hover:text-cyan-400 cursor-pointer"
              >
                +500 ml
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
