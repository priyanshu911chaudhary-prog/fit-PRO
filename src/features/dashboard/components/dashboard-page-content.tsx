"use client";

import React from "react";
import { Activity } from "lucide-react";
import { useDashboard } from "../hooks/use-dashboard";
import { DashboardHeader } from "./dashboard-header";
import { DashboardMetricHud } from "./dashboard-metric-hud";
import { BiometricProgressionCard } from "./biometric-progression-card";
import { TacticalLaunchpad } from "./tactical-launchpad";
import { RecentActivityLedgers } from "./recent-activity-ledgers";

export function DashboardPageContent() {
  const {
    user,
    stats,
    metrics,
    water,
    streak,
    greeting,
    isLoading,
    addingWater,
    chartMetric,
    setChartMetric,
    timeRange,
    setTimeRange,
    filteredChartData,
    metricDelta,
    handleQuickAddWater,
    router,
  } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-[70vh] flex-col items-center justify-center p-12 space-y-4">
        <div className="relative">
          <div className="size-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="size-5 text-emerald-400 animate-pulse" />
          </div>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
          Calibrating Telemetry Cockpit...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Athlete Live Status Header */}
      <DashboardHeader
        greeting={greeting}
        userName={user?.name}
        streak={streak}
      />

      {/* 2. Four Telemetry HUD Metric Cards */}
      <DashboardMetricHud
        water={water}
        metrics={metrics}
        addingWater={addingWater}
        onQuickAddWater={handleQuickAddWater}
        onNavigate={router.push}
      />

      {/* 3. Middle Bento Grid: Progression Telemetry & Tactical Launchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BiometricProgressionCard
          filteredChartData={filteredChartData}
          chartMetric={chartMetric}
          onChartMetricChange={setChartMetric}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          metricDelta={metricDelta}
        />

        <TacticalLaunchpad
          waterTotalMl={water?.totalMl || 0}
          addingWater={addingWater}
          onQuickAddWater={handleQuickAddWater}
        />
      </div>

      {/* 4. Bottom Row: Dual Activity Ledgers */}
      <RecentActivityLedgers
        recentWorkouts={stats?.recentWorkouts}
        recentMeals={stats?.recentMeals}
      />
    </div>
  );
}
