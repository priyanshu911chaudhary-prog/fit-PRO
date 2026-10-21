"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { MealTypeEnum } from "@/constants";
import { AddedFoodItem, FoodItem } from "../types";
import { calculateMealMacros } from "../lib/calculations";
import { calculateItemNutrients } from "@/lib/nutrition-engine";

export function useMealBuilder(onMealLogged?: () => Promise<void> | void) {
  const [mealType, setMealType] = useState<string>(MealTypeEnum.BREAKFAST);
  const [addedItems, setAddedItems] = useState<AddedFoodItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddFood = (food: FoodItem) => {
    const basis = food.servingBasis || "per_serving";
    const defaultUnit = food.servingUnit || (basis === "per_100g" ? "g" : basis === "per_100ml" ? "ml" : "serving");
    const defaultQty = food.defaultQuantity || (basis === "per_100g" ? 100 : 1);

    const existingIndex = addedItems.findIndex((i) => i.foodItemId === food._id);

    if (existingIndex >= 0) {
      // Consolidate quantity
      const existing = addedItems[existingIndex];
      const nextQty = existing.quantity + (defaultQty <= 5 ? 1 : 50);
      const nutrients = calculateItemNutrients(
        {
          name: existing.name,
          calories: existing.baseCalories ?? existing.calories,
          protein: existing.baseProtein ?? existing.protein,
          carbs: existing.baseCarbs ?? existing.carbs,
          fat: existing.baseFat ?? existing.fat,
          servingBasis: existing.servingBasis,
          servingUnit: existing.servingUnit,
          pieceWeightG: existing.pieceWeightG,
          servingWeightG: existing.servingWeightG,
        },
        nextQty,
        existing.unit
      );

      const updated = [...addedItems];
      updated[existingIndex] = {
        ...existing,
        quantity: nextQty,
        calories: Math.round(nutrients.calories),
        protein: Math.round(nutrients.protein * 10) / 10,
        carbs: Math.round(nutrients.carbs * 10) / 10,
        fat: Math.round(nutrients.fat * 10) / 10,
      };
      setAddedItems(updated);
      toast.info(`Updated ${food.name} portion to ${nextQty} ${existing.unit}`);
    } else {
      const nutrients = calculateItemNutrients(
        {
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          servingBasis: food.servingBasis,
          servingUnit: food.servingUnit,
          pieceWeightG: food.pieceWeightG,
          servingWeightG: food.servingWeightG,
        },
        defaultQty,
        defaultUnit
      );

      const newItem: AddedFoodItem = {
        foodItemId: food._id,
        name: food.name,
        baseCalories: food.calories,
        baseProtein: food.protein,
        baseCarbs: food.carbs,
        baseFat: food.fat,
        servingBasis: food.servingBasis || "per_serving",
        servingUnit: defaultUnit,
        pieceWeightG: food.pieceWeightG,
        servingWeightG: food.servingWeightG,
        quantity: defaultQty,
        unit: defaultUnit,
        calories: Math.round(nutrients.calories),
        protein: Math.round(nutrients.protein * 10) / 10,
        carbs: Math.round(nutrients.carbs * 10) / 10,
        fat: Math.round(nutrients.fat * 10) / 10,
      };

      setAddedItems((prev) => [...prev, newItem]);
      toast.success(`Added ${food.name} (${defaultQty} ${defaultUnit}) to plate`);
    }
  };

  const handleUpdateQuantity = (foodItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setAddedItems((prev) => prev.filter((i) => i.foodItemId !== foodItemId));
      return;
    }

    setAddedItems((prev) =>
      prev.map((item) => {
        if (item.foodItemId !== foodItemId) return item;

        const nutrients = calculateItemNutrients(
          {
            name: item.name,
            calories: item.baseCalories ?? item.calories,
            protein: item.baseProtein ?? item.protein,
            carbs: item.baseCarbs ?? item.carbs,
            fat: item.baseFat ?? item.fat,
            servingBasis: item.servingBasis,
            servingUnit: item.servingUnit,
            pieceWeightG: item.pieceWeightG,
            servingWeightG: item.servingWeightG,
          },
          quantity,
          item.unit
        );

        return {
          ...item,
          quantity,
          calories: Math.round(nutrients.calories),
          protein: Math.round(nutrients.protein * 10) / 10,
          carbs: Math.round(nutrients.carbs * 10) / 10,
          fat: Math.round(nutrients.fat * 10) / 10,
        };
      })
    );
  };

  const handleUpdateUnit = (foodItemId: string, unit: string) => {
    setAddedItems((prev) =>
      prev.map((item) => {
        if (item.foodItemId !== foodItemId) return item;

        const nutrients = calculateItemNutrients(
          {
            name: item.name,
            calories: item.baseCalories ?? item.calories,
            protein: item.baseProtein ?? item.protein,
            carbs: item.baseCarbs ?? item.carbs,
            fat: item.baseFat ?? item.fat,
            servingBasis: item.servingBasis,
            servingUnit: item.servingUnit,
            pieceWeightG: item.pieceWeightG,
            servingWeightG: item.servingWeightG,
          },
          item.quantity,
          unit
        );

        return {
          ...item,
          unit,
          calories: Math.round(nutrients.calories),
          protein: Math.round(nutrients.protein * 10) / 10,
          carbs: Math.round(nutrients.carbs * 10) / 10,
          fat: Math.round(nutrients.fat * 10) / 10,
        };
      })
    );
  };

  const handleAdjustQuantity = (foodItemId: string, delta: number) => {
    setAddedItems((prev) =>
      prev
        .map((item) => {
          if (item.foodItemId !== foodItemId) return item;

          const nextQty = Math.max(0, Number((item.quantity + delta).toFixed(1)));
          if (nextQty <= 0) return null as unknown as AddedFoodItem;

          const nutrients = calculateItemNutrients(
            {
              name: item.name,
              calories: item.baseCalories ?? item.calories,
              protein: item.baseProtein ?? item.protein,
              carbs: item.baseCarbs ?? item.carbs,
              fat: item.baseFat ?? item.fat,
              servingBasis: item.servingBasis,
              servingUnit: item.servingUnit,
              pieceWeightG: item.pieceWeightG,
              servingWeightG: item.servingWeightG,
            },
            nextQty,
            item.unit
          );

          return {
            ...item,
            quantity: nextQty,
            calories: Math.round(nutrients.calories),
            protein: Math.round(nutrients.protein * 10) / 10,
            carbs: Math.round(nutrients.carbs * 10) / 10,
            fat: Math.round(nutrients.fat * 10) / 10,
          };
        })
        .filter((item): item is AddedFoodItem => Boolean(item))
    );
  };

  const handleRemoveItem = (foodItemId: string) => {
    setAddedItems((prev) => prev.filter((i) => i.foodItemId !== foodItemId));
  };

  const handleClearPlate = () => {
    setAddedItems([]);
  };

  const macros = useMemo(() => calculateMealMacros(addedItems), [addedItems]);

  const handleSubmitMeal = async (selectedDate: string) => {
    if (addedItems.length === 0) {
      toast.error("Please add at least one food or ingredient to your plate.");
      return;
    }

    try {
      setIsSubmitting(true);
      const title = mealType.charAt(0).toUpperCase() + mealType.slice(1);

      const payload = {
        title,
        mealType,
        consumedDate: selectedDate,
        meals: addedItems.map((item) => ({
          foodItemId: item.foodItemId,
          quantity: item.quantity,
          unit: item.unit,
          servingSize: `${item.quantity} ${item.unit}`,
        })),
      };

      const res = await apiClient("/api/meal", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        toast.success(`Logged ${title} successfully!`, {
          description: `${addedItems.length} ingredients • ${macros.totalCalories} kcal`,
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
  };
}
