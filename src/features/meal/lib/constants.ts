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
  { id: "vegetables", label: "Vegetables" },
  { id: "fruits", label: "Fruits" },
  { id: "protein", label: "Proteins" },
  { id: "grains", label: "Grains & Staples" },
  { id: "dairy", label: "Dairy" },
  { id: "fats_oils", label: "Fats & Oils" },
  { id: "prepared", label: "Prepared" },
];
