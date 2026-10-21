import { Sun, Utensils, Moon, Cookie, LucideIcon } from "lucide-react";
import { MealTypeEnum } from "@/constants";
import { CategoryFilterId } from "../types";

export const MEAL_ICONS: Record<string, LucideIcon> = {
  [MealTypeEnum.BREAKFAST]: Sun,
  [MealTypeEnum.LUNCH]: Utensils,
  [MealTypeEnum.DINNER]: Moon,
  [MealTypeEnum.SNACK]: Cookie,
};

export const CATEGORY_FILTERS: { id: CategoryFilterId; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "high_protein", label: "High Protein" },
  { id: "low_carb", label: "Low Carb" },
  { id: "snack", label: "Snacks" },
];
