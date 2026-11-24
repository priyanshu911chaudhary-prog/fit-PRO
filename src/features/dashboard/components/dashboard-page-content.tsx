"use client";

import React from "react";
import { Activity } from "lucide-react";
import { useDashboard } from "../hooks/use-dashboard";
import { DashboardHeader } from "./dashboard-header";
import { DashboardMetrics } from "./dashboard-metrics";
import { BiometricProgressionCard } from "./biometric-progression-card";
import { QuickActions } from "./quick-actions";
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
            <Activity className="size-5 text-emerald-700 dark:text-emerald-400 animate-pulse" />
          </div>
        </div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
          Loading your dashboard…
        </p>
      </div>
    );
  }

  if (!stats) {
    return <div role="alert" className="mx-auto my-12 space-y-3 text-center"><p>Your dashboard could not be loaded.</p>
      <button className="underline" onClick={() => window.location.reload()}>Try again</button></div>;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-9 space-y-6">
      {/* 1. Athlete Live Status Header */}
      <DashboardHeader
        greeting={greeting}
        userName={user?.fullName || user?.name}
        streak={streak}
      />

      {/* 2. Four Telemetry HUD Metric Cards */}
      <DashboardMetrics
        water={water}
        metrics={metrics}
        addingWater={addingWater}
        onQuickAddWater={handleQuickAddWater}
        onNavigate={router.push}
      />

      {/* 3. Middle Bento Grid: Progression Telemetry & Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <BiometricProgressionCard
          filteredChartData={filteredChartData}
          chartMetric={chartMetric}
          onChartMetricChange={setChartMetric}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          metricDelta={metricDelta}
        />

        <QuickActions
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
