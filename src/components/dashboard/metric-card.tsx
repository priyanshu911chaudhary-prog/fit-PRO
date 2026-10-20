"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

export interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  target?: number;
  percentage?: number;
  statusText?: string;
  statusVariant?: "default" | "secondary" | "destructive" | "outline";
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
  subtext?: string;
  accent?: "emerald" | "cyan" | "amber" | "purple";
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  percentage,
  statusText,
  statusVariant = "secondary",
  icon,
  actionLabel,
  onAction,
  isLoading = false,
  subtext,
  accent = "emerald",
  className,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <Card
        data-testid="metric-card-loading"
        className={cn(
          "relative overflow-hidden border-border/50 bg-[#0B0F0E]/60 backdrop-blur-md animate-pulse",
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="h-4 w-28 bg-muted/40 rounded-md" />
          <div className="size-7 bg-muted/30 rounded-lg" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-9 w-24 bg-muted/40 rounded-md" />
          <div className="h-2 w-full bg-muted/30 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const accentBorder = {
    emerald: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    cyan: "hover:border-cyan-500/40 hover:shadow-cyan-500/5",
    amber: "hover:border-amber-500/40 hover:shadow-amber-500/5",
    purple: "hover:border-purple-500/40 hover:shadow-purple-500/5",
  }[accent];

  const accentBadge = {
    emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10",
    cyan: "border-cyan-500/20 text-cyan-400 bg-cyan-500/10",
    amber: "border-amber-500/20 text-amber-400 bg-amber-500/10",
    purple: "border-purple-500/20 text-purple-400 bg-purple-500/10",
  }[accent];

  return (
    <Card
      data-testid="metric-card"
      className={cn(
        "group relative overflow-hidden border-border/60 bg-[#0B0F0E]/75 backdrop-blur-md transition-all duration-300 hover:shadow-xl",
        accentBorder,
        className
      )}
    >
      {/* Top telemetry hairline */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          {icon && (
            <span className="p-1 rounded-md bg-muted/30 text-foreground group-hover:scale-105 transition-transform">
              {icon}
            </span>
          )}
          {title}
        </CardTitle>
        {statusText && (
          <Badge
            variant={statusVariant}
            className={cn("text-[11px] font-medium tracking-tight px-2 py-0.5", accentBadge)}
          >
            {statusText}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-medium text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          {actionLabel && onAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAction}
              className="text-xs h-7 px-2.5 font-medium border-border/80 bg-background/50 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-400 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {actionLabel}
            </Button>
          )}
        </div>

        {subtext && (
          <p className="text-[11px] text-muted-foreground/80 line-clamp-1">{subtext}</p>
        )}

        {typeof percentage === "number" && (
          <div className="space-y-1.5 pt-0.5">
            <Progress
              value={Math.min(100, Math.max(0, percentage))}
              className="h-1.5 bg-muted/40"
            />
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>Progress</span>
              <span className="font-semibold text-foreground">{Math.round(percentage)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

