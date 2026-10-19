"use client";

import React, { Suspense, useEffect, useState } from "react";
import {
  Utensils,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  History,
  CheckCircle2,
  Search,
  Apple,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { MealTypeEnum } from "@/constants";

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

function MealContent() {
  const [activeTab, setActiveTab] = useState("log");

  // Catalog State
  const [foodsCatalog, setFoodsCatalog] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Meal Form State
  const [mealType, setMealType] = useState("breakfast");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [addedItems, setAddedItems] = useState<AddedFoodItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      toast.info(`Increased quantity for ${food.name}`);
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
      toast.success(`Added ${food.name}`);
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

  const handleRemoveItem = (foodItemId: string) => {
    setAddedItems(addedItems.filter((i) => i.foodItemId !== foodItemId));
  };

  // Live macro calculation
  const totalCalories = addedItems.reduce((acc, item) => acc + item.calories * item.quantity, 0);
  const totalProtein = addedItems.reduce((acc, item) => acc + item.protein * item.quantity, 0);
  const totalCarbs = addedItems.reduce((acc, item) => acc + item.carbs * item.quantity, 0);
  const totalFat = addedItems.reduce((acc, item) => acc + item.fat * item.quantity, 0);

  const handleSubmitMeal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (addedItems.length === 0) {
      toast.error("Please add at least one food item to your meal.");
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
            servingSize: `${i.quantity} serving${i.quantity > 1 ? "s" : ""}`,
            calories: i.calories * i.quantity,
          })),
        }),
      });

      if (res.success) {
        toast.success("Meal logged successfully!");
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

  const filteredCatalog = foodsCatalog.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Nutrition & Meals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Server-validated macronutrients with catalog lookup and real-time caloric calculation.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="log" className="flex items-center gap-2">
            <Plus className="size-4" />
            Log Meal
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="size-4" />
            Meal History ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LOG MEAL */}
        <TabsContent value="log" className="space-y-6">
          <form onSubmit={handleSubmitMeal}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Meal Config & Food Picker */}
              <div className="space-y-6">
                <Card className="border-border/60 bg-card/75 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Meal Details</CardTitle>
                    <CardDescription className="text-xs">
                      Select date and meal category
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-background/50"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Meal Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(MealTypeEnum).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setMealType(type)}
                            className={`p-2.5 rounded-xl text-center border text-xs capitalize transition-all ${
                              mealType === type
                                ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold ring-2 ring-emerald-500/20"
                                : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Food Catalog Picker */}
                <Card className="border-border/60 bg-card/75 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span>Foods Catalog</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {filteredCatalog.length} foods
                      </span>
                    </CardTitle>
                    <div className="pt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Search foods..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 text-xs h-9 bg-background/50"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                      {filteredCatalog.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          No foods found matching search.
                        </p>
                      ) : (
                        filteredCatalog.map((food) => (
                          <div
                            key={food._id}
                            className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-muted/20 hover:bg-muted/50 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-foreground">{food.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {food.calories} kcal • P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => handleAddFood(food)}
                              className="text-xs h-7 px-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
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

              {/* Right Column: Selected Foods & Macro Breakdown */}
              <div className="lg:col-span-2 space-y-4">
                {/* Live Macro Summary Header */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-card/60 backdrop-blur-md text-center">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Calories</span>
                    <p className="text-xl font-extrabold text-foreground">{totalCalories}</p>
                    <span className="text-[10px] text-muted-foreground">kcal</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 text-center">
                    <span className="text-[10px] text-indigo-400 uppercase font-bold">Protein</span>
                    <p className="text-xl font-extrabold text-indigo-400">{totalProtein}g</p>
                    <span className="text-[10px] text-muted-foreground">{totalProtein * 4} kcal</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center">
                    <span className="text-[10px] text-amber-400 uppercase font-bold">Carbs</span>
                    <p className="text-xl font-extrabold text-amber-400">{totalCarbs}g</p>
                    <span className="text-[10px] text-muted-foreground">{totalCarbs * 4} kcal</span>
                  </div>
                  <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 text-center">
                    <span className="text-[10px] text-rose-400 uppercase font-bold">Fats</span>
                    <p className="text-xl font-extrabold text-rose-400">{totalFat}g</p>
                    <span className="text-[10px] text-muted-foreground">{totalFat * 9} kcal</span>
                  </div>
                </div>

                <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-base font-bold">Plate Breakdown</CardTitle>
                      <CardDescription className="text-xs">
                        Adjust servings for each selected food
                      </CardDescription>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      {addedItems.length} Items
                    </span>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {addedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground space-y-3">
                        <Apple className="size-10 opacity-30" />
                        <p>No food items added yet. Select items from the catalog on the left.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {addedItems.map((item) => (
                          <div
                            key={item.foodItemId}
                            className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-foreground">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {item.calories * item.quantity} kcal • P: {item.protein * item.quantity}g | C: {item.carbs * item.quantity}g | F: {item.fat * item.quantity}g
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <Label className="text-[10px] text-muted-foreground">Qty:</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(item.foodItemId, Number(e.target.value))
                                  }
                                  className="w-16 h-7 text-xs text-center bg-background/50"
                                />
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.foodItemId)}
                                className="size-7 text-muted-foreground hover:text-rose-400"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <div className="pt-4 flex justify-end">
                          <Button
                            type="submit"
                            id="submit-meal-btn"
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-md shadow-emerald-500/20"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Saving Meal...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-4 mr-2" />
                                Save Meal to Log
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
        <TabsContent value="history" className="space-y-4">
          <Card className="border-border/60 bg-card/75 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="size-4 text-emerald-400" />
                Logged Nutrition History
              </CardTitle>
              <CardDescription className="text-xs">
                Chronological list of all logged meals and macronutrient distributions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="size-6 text-emerald-500 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  No meals logged yet. Switch to &quot;Log Meal&quot; to record your first meal!
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((record) => (
                    <div
                      key={record._id}
                      className="p-4 rounded-xl border border-border/60 bg-muted/20 hover:border-emerald-500/30 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <Utensils className="size-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-foreground capitalize">
                                {record.title || record.mealType || "Meal"}
                              </h4>
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                {record.totalCalories} kcal
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatSafeDate(record.createdAt || record.date)}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLog(record._id)}
                          className="size-8 text-muted-foreground hover:text-rose-500 self-end sm:self-center"
                          aria-label="Delete meal log"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      {/* Food items breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
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
                              className="p-2.5 rounded-lg bg-background/50 border border-border/30 text-xs space-y-1"
                            >
                              <p className="font-semibold text-foreground truncate">
                                {foodName}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {serving} • {caloriesVal} kcal
                              </p>
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
      </Tabs>
    </div>
  );
}

export default function MealPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl p-8">
          <div className="w-full h-96 rounded-xl bg-card/50 animate-pulse" />
        </div>
      }
    >
      <MealContent />
    </Suspense>
  );
}
