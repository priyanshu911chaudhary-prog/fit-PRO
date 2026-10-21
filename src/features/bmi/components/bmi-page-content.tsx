"use client";

import React from "react";
import { useBmi } from "../hooks/use-bmi";
import { BmiHeader } from "./bmi-header";
import { BmiMeasurementForm } from "./bmi-measurement-form";
import { BmiProgressionChart } from "./bmi-progression-chart";
import { BmiHistoryTable } from "./bmi-history-table";

export function BmiPageContent() {
  const {
    history,
    isLoading,
    isSubmitting,
    chartMetric,
    setChartMetric,
    weight,
    setWeight,
    height,
    setHeight,
    liveBMI,
    estBmr,
    spectrumPct,
    chartData,
    historyDelta,
    categoryColor,
    handleSubmit,
  } = useBmi();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <BmiHeader historyDelta={historyDelta} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Live Anthropometric Measurement Station */}
        <div className="lg:col-span-5 space-y-6">
          <BmiMeasurementForm
            height={height}
            onHeightChange={setHeight}
            weight={weight}
            onWeightChange={setWeight}
            liveBMI={liveBMI}
            estBmr={estBmr}
            spectrumPct={spectrumPct}
            categoryColor={categoryColor}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Right Column (7 cols): Progression Area Curve */}
        <div className="lg:col-span-7 space-y-4">
          <BmiProgressionChart
            chartData={chartData}
            chartMetric={chartMetric}
            onChartMetricChange={setChartMetric}
          />
        </div>
      </div>

      {/* 2. Chronological Anthropometric Ledger */}
      <BmiHistoryTable history={history} isLoading={isLoading} />
    </div>
  );
}
