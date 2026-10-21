"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { MealTypeEnum } from "@/constants";
import { AddedFoodItem, FoodItem } from "../types";
import { calculateMealMacros } from "../lib/calculations";

export function useMealBuilder(onMealLogged?: () => Promise<void> | void) {
  const [mealType, setMealType] = useState<string>(MealTypeEnum.BREAKFAST);
  const [addedItems, setAddedItems] = useState<AddedFoodItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  });

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

  const macros = useMemo(() => calculateMealMacros(addedItems), [addedItems]);

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
          totalCalories: macros.totalCalories,
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
          description: `Recorded ${addedItems.length} items • ${macros.totalCalories} kcal`,
        });
        setAddedItems([]);
        if (onMealLogged) {
          await onMealLogged();
        }
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

  return {
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
  };
}
