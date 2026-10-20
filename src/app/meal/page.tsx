"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import {
  Utensils,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Calendar,
  History,
  CheckCircle2,
  Search,
  Apple,
  Flame,
  Activity,
  Zap,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { MealTypeEnum } from "@/constants";
import { cn } from "cn";

interface FoodItem {
  _id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  mealType?: string;
  dietaryPreference?: string;
}

interface AddedFoodItem {
  foodItemId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
}

interface MealLogItemRecord {
  foodItemId?: {
    _id?: string;
    name?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  } | string;
  foodItem?: {
    _id?: string;
    name?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  } | string;
  servingSize?: string;
  calories?: number;
  quantity?: number;
}

interface MealLogRecord {
  _id: string;
  title?: string;
  mealType?: string;
  totalCalories: number;
  date?: string;
  createdAt?: string;
  meals?: MealLogItemRecord[];
  items?: MealLogItemRecord[];
}

function formatSafeDate(val?: string | Date): string {
  if (!val) return "Today";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "Today";

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${dateStr} at ${timeStr}`;
}

const MEAL_ICONS = {
  [MealTypeEnum.BREAKFAST]: Sun,
  [MealTypeEnum.LUNCH]: Utensils,
  [MealTypeEnum.DINNER]: Moon,
  [MealTypeEnum.SNACK]: Cookie,
};

function MealContent() {
  const [activeTab, setActiveTab] = useState("log");

  // Catalog State
  const [foodsCatalog, setFoodsCatalog] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Meal Form State
  const [mealType, setMealType] = useState<string>(MealTypeEnum.BREAKFAST);
  const [date, setDate] = useState<string>("2026-10-19");
  const [addedItems, setAddedItems] = useState<AddedFoodItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      setDate(new Date().toISOString().split("T")[0]);
    } catch {}
  }, []);

  // History State
  const [history, setHistory] = useState<MealLogRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load Catalog
  useEffect(() => {
    let isMounted = true;
    apiClient<{ foods: FoodItem[] }>("/api/foods?limit=50")
      .then((res) => {
        if (isMounted && res.data?.foods) {
          setFoodsCatalog(res.data.foods);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Load History
  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await apiClient<{ logs: MealLogRecord[] }>("/api/meal");
      if (res.data?.logs) {
        setHistory(res.data.logs);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient<{ logs: MealLogRecord[] }>("/api/meal")
      .then((res) => {
        if (isMounted && res.data?.logs) {
          setHistory(res.data.logs);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddFood = (food: FoodItem) => {
    const existing = addedItems.find((i) => i.foodItemId === food._id);
    if (existing) {
      setAddedItems(
        addedItems.map((i) =>
          i.foodItemId === food._id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
      toast.info(`Increased portion for ${food.name}`);
    } else {
      setAddedItems([
        ...addedItems,
        {
          foodItemId: food._id,
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          quantity: 1,
        },
      ]);
      toast.success(`Added ${food.name} to plate`);
    }
  };

  const handleUpdateQuantity = (foodItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setAddedItems(addedItems.filter((i) => i.foodItemId !== foodItemId));
      return;
    }
    setAddedItems(
      addedItems.map((i) => (i.foodItemId === foodItemId ? { ...i, quantity } : i))
    );
  };

  const handleAdjustQuantity = (foodItemId: string, delta: number) => {
    setAddedItems(
      addedItems
        .map((i) => {
          if (i.foodItemId === foodItemId) {
            const nextQty = Math.max(0, Number((i.quantity + delta).toFixed(1)));
            return { ...i, quantity: nextQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveItem = (foodItemId: string) => {
    setAddedItems(addedItems.filter((i) => i.foodItemId !== foodItemId));
  };

  // Live macro calculation
  const totalCalories = useMemo(
    () => addedItems.reduce((acc, item) => acc + Math.round(item.calories * item.quantity), 0),
    [addedItems]
  );
  const totalProtein = useMemo(
    () => addedItems.reduce((acc, item) => acc + Math.round(item.protein * item.quantity), 0),
    [addedItems]
  );
  const totalCarbs = useMemo(
    () => addedItems.reduce((acc, item) => acc + Math.round(item.carbs * item.quantity), 0),
    [addedItems]
  );
  const totalFat = useMemo(
    () => addedItems.reduce((acc, item) => acc + Math.round(item.fat * item.quantity), 0),
    [addedItems]
  );

  // Macro Energy Percentages
  const proteinCals = totalProtein * 4;
  const carbsCals = totalCarbs * 4;
  const fatCals = totalFat * 9;
  const macroCalSum = proteinCals + carbsCals + fatCals || 1;

  const proteinPct = Math.round((proteinCals / macroCalSum) * 100);
  const carbsPct = Math.round((carbsCals / macroCalSum) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  const handleSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (addedItems.length === 0) {
      toast.error("Please add at least one food item to your meal plate.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient("/api/meal", {
        method: "POST",
        body: JSON.stringify({
          title: mealType.charAt(0).toUpperCase() + mealType.slice(1),
          mealType,
          totalCalories,
          meals: addedItems.map((i) => ({
            foodItemId: i.foodItemId,
            quantity: i.quantity,
            servingSize: `${i.quantity} serving${i.quantity > 1 ? "s" : ""}`,
            calories: Math.round(i.calories * i.quantity),
          })),
        }),
      });

      if (res.success) {
        toast.success("Meal logged successfully!", {
          description: `Recorded ${addedItems.length} items • ${totalCalories} kcal`,
        });
        setAddedItems([]);
        await fetchHistory();
        setActiveTab("history");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to log meal";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await apiClient(`/api/meal/${id}`, {
        method: "DELETE",
      });
      if (res.success) {
        toast.success("Meal log removed");
        await fetchHistory();
      }
    } catch {
      toast.error("Failed to delete meal log");
    }
  };

  const filteredCatalog = useMemo(() => {
    return foodsCatalog.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (categoryFilter === "high_protein") return matchesSearch && item.protein >= 20;
      if (categoryFilter === "low_carb") return matchesSearch && item.carbs <= 10;
      if (categoryFilter === "snack") return matchesSearch && item.calories <= 250;
      return matchesSearch;
    });
  }, [foodsCatalog, searchQuery, categoryFilter]);

  return (
    <Tabs value={activeTab} onValueChange={(val) => val && setActiveTab(val)} className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                <Utensils className="size-3.5" />
                NUTRITIONAL TELEMETRY
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                MACRO RATIOS ACTIVE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Nutrition & Macronutrient Ledger
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Precision macronutrient tracking, real-time energy calculation, and dietary fuel logging.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <TabsList className="bg-background/60 border border-border/70 p-1 rounded-xl">
              <TabsTrigger
                value="log"
                onClick={() => setActiveTab("log")}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "log" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Plus className="size-3.5" />
                Log Meal
              </TabsTrigger>
              <TabsTrigger
                value="history"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                  activeTab === "history" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <History className="size-3.5" />
                History ({history.length})
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* TAB 1: LOG MEAL */}
        <TabsContent value="log" className="space-y-6 mt-0">
          {/* Dynamic Macro Fuel HUD (Top 4 Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Energy */}
            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Flame className="size-3.5 text-emerald-400" />
                  Total Energy
                </span>
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400">
                  PLATE
                </Badge>
              </div>
              <div className="text-2xl font-extrabold font-mono text-foreground">
                {totalCalories} <span className="text-xs font-sans text-muted-foreground font-normal">kcal</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">Metabolic fuel sum</p>
            </Card>

            {/* Protein */}
            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Activity className="size-3.5 text-cyan-400" />
                  Protein
                </span>
                <span className="text-[10px] font-mono text-cyan-400">{proteinPct}%</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-cyan-400">
                {totalProtein} <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">{proteinCals} kcal • Muscle synthesis</p>
            </Card>

            {/* Carbs */}
            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-400" />
                  Carbohydrates
                </span>
                <span className="text-[10px] font-mono text-amber-400">{carbsPct}%</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-amber-400">
                {totalCarbs} <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">{carbsCals} kcal • Glycogen replenish</p>
            </Card>

            {/* Fats */}
            <Card className="border-border/60 bg-[#0B0F0E]/70 backdrop-blur-md p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="size-3.5 text-purple-400" />
                  Lipids & Fats
                </span>
                <span className="text-[10px] font-mono text-purple-400">{fatPct}%</span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-purple-400">
                {totalFat} <span className="text-xs font-sans text-muted-foreground font-normal">g</span>
              </div>
              <p className="text-[11px] text-muted-foreground/80">{fatCals} kcal • Hormonal baseline</p>
            </Card>
          </div>

          {/* Segmented Macro Bar */}
          {totalCalories > 0 && (
            <div className="p-3.5 rounded-xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-md space-y-2">
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>Macronutrient Ratio Breakdown</span>
                <span className="text-foreground">100% Caloric Coverage</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden flex">
                <div
                  style={{ width: `${proteinPct}%` }}
                  className="bg-cyan-400 h-full transition-all duration-300"
                  title={`Protein: ${proteinPct}%`}
                />
                <div
                  style={{ width: `${carbsPct}%` }}
                  className="bg-amber-400 h-full transition-all duration-300"
                  title={`Carbs: ${carbsPct}%`}
                />
                <div
                  style={{ width: `${fatPct}%` }}
                  className="bg-purple-400 h-full transition-all duration-300"
                  title={`Fats: ${fatPct}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="size-2 rounded-full bg-cyan-400" />
                  Protein: {proteinPct}% ({totalProtein}g)
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="size-2 rounded-full bg-amber-400" />
                  Carbs: {carbsPct}% ({totalCarbs}g)
                </span>
                <span className="flex items-center gap-1.5 text-purple-400">
                  <span className="size-2 rounded-full bg-purple-400" />
                  Fats: {fatPct}% ({totalFat}g)
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitMeal}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (5 cols): Meal Configuration & Food Catalog */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1. Meal Details Card */}
                <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Zap className="size-4 text-cyan-400" />
                      Meal Parameters
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Session timing and designated meal window
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="date" className="text-xs font-medium text-muted-foreground">
                        Meal Date
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Designated Window
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(MealTypeEnum).map((type) => {
                          const IconComp = MEAL_ICONS[type] || Utensils;
                          const isSelected = mealType === type;

                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setMealType(type)}
                              className={cn(
                                "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs capitalize transition-all cursor-pointer font-medium",
                                isSelected
                                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-semibold shadow-xs"
                                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                              )}
                            >
                              <IconComp className={cn("size-4", isSelected ? "text-cyan-400" : "text-muted-foreground")} />
                              <span>{type}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Food Catalog Picker */}
                <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Search className="size-4 text-emerald-400" />
                        Nutrition Catalog
                      </CardTitle>
                      <Badge variant="outline" className="text-[10px] font-mono border-border/80 text-muted-foreground">
                        {filteredCatalog.length} foods
                      </Badge>
                    </div>

                    <div className="pt-2 space-y-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search chicken, oats, eggs, whey..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-8 text-xs h-8 bg-background/50 border-border/70 text-foreground"
                        />
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
                        {[
                          { id: "all", label: "All Items" },
                          { id: "high_protein", label: "High Protein" },
                          { id: "low_carb", label: "Low Carb" },
                          { id: "snack", label: "Snacks" },
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryFilter(cat.id)}
                            className={cn(
                              "px-2.5 py-1 rounded-md border shrink-0 transition-all cursor-pointer font-medium",
                              categoryFilter === cat.id
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold shadow-xs"
                                : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                            )}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-3">
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {filteredCatalog.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No items matching query.
                        </div>
                      ) : (
                        filteredCatalog.map((food) => (
                          <div
                            key={food._id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/30 transition-all group"
                          >
                            <div className="space-y-0.5 min-w-0 pr-2">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-cyan-400 transition-colors">
                                {food.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                                <span className="text-foreground font-bold">{food.calories} kcal</span>
                                <span>•</span>
                                <span className="text-cyan-400">P:{food.protein}g</span>
                                <span className="text-amber-400">C:{food.carbs}g</span>
                                <span className="text-purple-400">F:{food.fat}g</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddFood(food)}
                              className="h-7 px-2.5 text-xs font-medium border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50 cursor-pointer shrink-0"
                            >
                              <Plus className="size-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (7 cols): Staged Plate Breakdown */}
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
                    <div>
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                        <Apple className="size-4 text-emerald-400" />
                        Plate Fuel Breakdown
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Adjust servings, verify portion sizes, and calculate meal energy
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                      {addedItems.length} Food Items
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4">
                    {addedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-14 text-center text-xs text-muted-foreground space-y-3">
                        <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center">
                          <Apple className="size-6 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground text-sm">Plate is currently empty</p>
                          <p className="text-[11px] text-muted-foreground max-w-sm">
                            Pick food items from the catalog on the left to compute live protein, carbs, fats, and total caloric energy.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {addedItems.map((item) => (
                          <div
                            key={item.foodItemId}
                            className="p-3.5 rounded-xl border border-border/70 bg-card/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/30 transition-all"
                          >
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-bold text-foreground">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
                                <span className="font-bold text-foreground">
                                  {Math.round(item.calories * item.quantity)} kcal
                                </span>
                                <span>•</span>
                                <span className="text-cyan-400">
                                  P: {Math.round(item.protein * item.quantity)}g
                                </span>
                                <span>•</span>
                                <span className="text-amber-400">
                                  C: {Math.round(item.carbs * item.quantity)}g
                                </span>
                                <span>•</span>
                                <span className="text-purple-400">
                                  F: {Math.round(item.fat * item.quantity)}g
                                </span>
                              </div>
                            </div>

                            {/* Servings Stepper */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustQuantity(item.foodItemId, -0.5)}
                                  className="size-7 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                                  title="-0.5 serving"
                                >
                                  <Minus className="size-3" />
                                </button>
                                <Input
                                  type="number"
                                  min={0.5}
                                  max={50}
                                  step={0.5}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(item.foodItemId, Number(e.target.value))
                                  }
                                  className="w-16 h-7 text-xs font-mono text-center bg-background/60 border-border/70 text-foreground px-1"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAdjustQuantity(item.foodItemId, 0.5)}
                                  className="size-7 rounded border border-border/80 bg-muted/30 hover:bg-muted/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                                  title="+0.5 serving"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.foodItemId)}
                                className="size-7 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                                aria-label="Remove food"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/40">
                          <div className="text-xs font-mono text-muted-foreground">
                            Energy Yield: <strong className="text-emerald-400 font-bold">{totalCalories} kcal</strong> across {addedItems.length} items
                          </div>

                          <Button
                            type="submit"
                            id="submit-meal-btn"
                            disabled={isSubmitting}
                            className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Committing Fuel Log...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-4 mr-2" />
                                Commit Meal to Log
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* TAB 2: HISTORY */}
        <TabsContent value="history" className="space-y-4 mt-0">
          <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <History className="size-4 text-cyan-400" />
                  Logged Nutrition History
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Complete chronological archive of all consumed meals and caloric intakes
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                {history.length} Logged Meals
              </Badge>
            </CardHeader>

            <CardContent className="pt-4">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3">
                  <Loader2 className="size-8 text-cyan-400 animate-spin" />
                  <p className="text-xs font-mono text-muted-foreground">
                    Retrieving nutrition ledger...
                  </p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-14 text-center text-xs text-muted-foreground space-y-3">
                  <div className="size-12 rounded-2xl bg-muted/20 border border-border/70 flex items-center justify-center mx-auto">
                    <Utensils className="size-6 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground text-sm">No meals logged yet</p>
                    <p className="text-[11px] text-muted-foreground">
                      Switch to &quot;Log Meal&quot; to track your first nutritional fuel session.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("log")}
                    className="bg-primary text-primary-foreground font-semibold text-xs h-8 px-3"
                  >
                    <Plus className="size-3.5 mr-1" />
                    Log First Meal
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((record) => (
                    <div
                      key={record._id}
                      className="p-4 sm:p-5 rounded-xl border border-border/70 bg-card/40 hover:border-cyan-500/40 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                            <Utensils className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground capitalize">
                                {record.title || record.mealType || "Meal"}
                              </h4>
                              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-400">
                                {record.totalCalories} kcal
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 font-mono">
                              <Calendar className="size-3 text-cyan-400" />
                              {formatSafeDate(record.createdAt || record.date)}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLog(record._id)}
                          className="size-8 text-muted-foreground hover:text-rose-400 self-end sm:self-center transition-colors cursor-pointer"
                          aria-label="Delete meal log"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {/* Food items breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                        {(record.meals || record.items || []).map((item, itemIdx) => {
                          const foodName =
                            typeof item.foodItemId === "object" && item.foodItemId !== null
                              ? (item.foodItemId as { name?: string }).name
                              : typeof item.foodItem === "object" && item.foodItem !== null
                              ? (item.foodItem as { name?: string }).name
                              : "Food";

                          const caloriesVal =
                            item.calories ??
                            (typeof item.foodItemId === "object" && item.foodItemId !== null
                              ? (item.foodItemId as { calories?: number }).calories
                              : typeof item.foodItem === "object" && item.foodItem !== null
                              ? (item.foodItem as { calories?: number }).calories
                              : 0) ??
                            0;

                          const serving =
                            item.servingSize ||
                            (item.quantity ? `${item.quantity} serving(s)` : "1 serving");

                          return (
                            <div
                              key={itemIdx}
                              className="p-3 rounded-lg bg-background/50 border border-border/40 text-xs space-y-1"
                            >
                              <p className="font-semibold text-foreground truncate">
                                {foodName}
                              </p>
                              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                                <span>{serving}</span>
                                <span className="text-emerald-400 font-bold">{caloriesVal} kcal</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  );
}

export default function MealPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-7xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <MealContent />
    </Suspense>
  );
}
