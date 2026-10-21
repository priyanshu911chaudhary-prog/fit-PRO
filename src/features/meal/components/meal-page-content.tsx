"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFoodCatalog } from "../hooks/use-food-catalog";
import { useMealHistory } from "../hooks/use-meal-history";
import { useMealBuilder } from "../hooks/use-meal-builder";
import { MealHeader } from "./meal-header";
import { MealMacroHud } from "./meal-macro-hud";
import { MealMacroBar } from "./meal-macro-bar";
import { MealParametersCard } from "./meal-parameters-card";
import { FoodCatalogPicker } from "./food-catalog-picker";
import { MealPlateBuilder } from "./meal-plate-builder";
import { MealHistoryList } from "./meal-history-list";
import { normalizeDateOnly } from "@/lib/nutrition-engine";

export function MealPageContent() {
  const [activeTab, setActiveTab] = useState("log");
  const todayStr = normalizeDateOnly();

  const {
    selectedDate,
    setSelectedDate,
    history,
    isLoadingHistory,
    dailyTotals,
    dailyTargets,
    fetchHistory,
    handlePrevDay,
    handleNextDay,
    handleSetToday,
    handleDeleteLog,
  } = useMealHistory();

  const {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    filteredCatalog,
    isLoadingCatalog,
  } = useFoodCatalog();

  const {
    mealType,
    setMealType,
    addedItems,
    isSubmitting,
    handleAddFood,
    handleUpdateQuantity,
    handleUpdateUnit,
    handleAdjustQuantity,
    handleRemoveItem,
    handleClearPlate,
    macros,
    handleSubmitMeal,
  } = useMealBuilder(async () => {
    await fetchHistory(selectedDate);
  });

  const isToday = selectedDate === todayStr;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => val && setActiveTab(val)}
      className="container mx-auto max-w-7xl px-4 py-8 space-y-6"
    >
      <MealHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        historyCount={history.length}
      />

      {/* Date Navigation & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-emerald-400" />
          <span className="text-xs font-semibold text-foreground">Selected Consumption Day:</span>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {isToday ? "Today" : selectedDate}
          </span>
          {isToday && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrevDay}
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Previous day"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Input
            id="meal-consumption-date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="w-36 h-8 text-xs font-mono bg-background/60 border-border/70 text-foreground px-2"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSetToday}
            disabled={isToday}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer"
          >
            <Clock className="size-3 mr-1" />
            Today
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNextDay}
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Next day"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Top Section: Daily Nutrition Ledger Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-400" />
            Daily Nutrition Ledger • {isToday ? "Today" : selectedDate}
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            {history.length} {history.length === 1 ? "logged meal" : "logged meals"}
          </span>
        </div>

        <MealMacroHud macros={dailyTotals} targets={dailyTargets} isToday={isToday} />
        <MealMacroBar macros={dailyTotals} />
      </div>

      {/* Tabs Content */}
      <TabsContent value="log" className="space-y-6 mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Meal Window & Food Catalog */}
          <div className="lg:col-span-5 space-y-6">
            <MealParametersCard
              date={selectedDate}
              onDateChange={setSelectedDate}
              mealType={mealType}
              onMealTypeChange={setMealType}
            />

            <FoodCatalogPicker
              filteredCatalog={filteredCatalog}
              isLoadingCatalog={isLoadingCatalog}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              onAddFood={handleAddFood}
            />
          </div>

          {/* Right Column: Meal Plate Builder & Draft Workspace */}
          <div className="lg:col-span-7 space-y-4">
            <MealPlateBuilder
              addedItems={addedItems}
              macros={macros}
              mealType={mealType}
              isSubmitting={isSubmitting}
              onAdjustQuantity={handleAdjustQuantity}
              onUpdateQuantity={handleUpdateQuantity}
              onUpdateUnit={handleUpdateUnit}
              onRemoveItem={handleRemoveItem}
              onClearPlate={handleClearPlate}
              onSubmitMeal={(e) => {
                e.preventDefault();
                handleSubmitMeal(selectedDate);
              }}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="history" className="space-y-4 mt-0">
        <MealHistoryList
          history={history}
          isLoadingHistory={isLoadingHistory}
          selectedDate={selectedDate}
          onNavigateToLog={() => setActiveTab("log")}
          onDeleteLog={handleDeleteLog}
        />
      </TabsContent>
    </Tabs>
  );
}
