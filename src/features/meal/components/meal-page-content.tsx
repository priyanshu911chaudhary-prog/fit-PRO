"use client";

import React, { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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

export function MealPageContent() {
  const [activeTab, setActiveTab] = useState("log");

  const {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    filteredCatalog,
  } = useFoodCatalog();

  const { history, isLoadingHistory, fetchHistory, handleDeleteLog } = useMealHistory();

  const {
    mealType,
    setMealType,
    date,
    setDate,
    addedItems,
    isSubmitting,
    handleAddFood,
    handleUpdateQuantity,
    handleAdjustQuantity,
    handleRemoveItem,
    macros,
    handleSubmitMeal,
  } = useMealBuilder(async () => {
    await fetchHistory();
    setActiveTab("history");
  });

  return (
    <Tabs
      value={activeTab}
      onValueChange={(val) => val && setActiveTab(val)}
      className="container mx-auto max-w-7xl px-4 py-8 space-y-8"
    >
      <MealHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        historyCount={history.length}
      />

      <div className="space-y-6">
        <TabsContent value="log" className="space-y-6 mt-0">
          <MealMacroHud macros={macros} />
          <MealMacroBar macros={macros} />

          <form onSubmit={handleSubmitMeal}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-6">
                <MealParametersCard
                  date={date}
                  onDateChange={setDate}
                  mealType={mealType}
                  onMealTypeChange={setMealType}
                />
                <FoodCatalogPicker
                  filteredCatalog={filteredCatalog}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  onAddFood={handleAddFood}
                />
              </div>

              <div className="lg:col-span-7 space-y-4">
                <MealPlateBuilder
                  addedItems={addedItems}
                  totalCalories={macros.totalCalories}
                  isSubmitting={isSubmitting}
                  onAdjustQuantity={handleAdjustQuantity}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                />
              </div>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-0">
          <MealHistoryList
            history={history}
            isLoadingHistory={isLoadingHistory}
            onNavigateToLog={() => setActiveTab("log")}
            onDeleteLog={handleDeleteLog}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}
