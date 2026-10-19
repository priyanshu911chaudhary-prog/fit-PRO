import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const mealItemSchema = z.preprocess((val: unknown) => {
  if (typeof val === "object" && val !== null) {
    const item = val as Record<string, unknown>;
    const foodItemId = item.foodItemId || item.foodItem || item.foodId || item._id;
    const quantity = Number(item.quantity) || 1;
    const servingSize =
      typeof item.servingSize === "string"
        ? item.servingSize
        : `${quantity} serving${quantity > 1 ? "s" : ""}`;

    return {
      foodItemId,
      servingSize,
      calories: typeof item.calories === "number" ? item.calories : undefined,
    };
  }
  return val;
}, z.object({
  foodItemId: z
    .string()
    .regex(objectIdRegex, "Invalid food item ID format"),
  servingSize: z
    .string()
    .min(1, "Serving size cannot be empty")
    .max(50, "Serving size cannot exceed 50 characters")
    .default("1 serving"),
  calories: z.number().min(0).max(10000).optional(),
}));

export const logMealSchema = z.preprocess((val: unknown) => {
  if (typeof val === "object" && val !== null) {
    const data = val as Record<string, unknown>;
    const rawTitle = data.title || data.mealType || "Meal";
    const title =
      typeof rawTitle === "string"
        ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
        : "Meal";

    const rawMeals = Array.isArray(data.meals)
      ? data.meals
      : Array.isArray(data.items)
      ? data.items
      : [];

    return {
      ...data,
      title,
      meals: rawMeals,
    };
  }
  return val;
}, z.object({
  title: z
    .string()
    .min(1, "Meal title cannot be empty")
    .max(100, "Meal title cannot exceed 100 characters")
    .trim(),
  meals: z.array(mealItemSchema).min(1, "At least one meal item must be logged"),
  totalCalories: z.number().min(0).optional(),
  completionPercentage: z.number().min(0).max(100).default(100),
}));

export const mealHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type MealItemInput = z.infer<typeof mealItemSchema>;
export type LogMealInput = z.infer<typeof logMealSchema>;
export type MealHistoryQueryInput = z.infer<typeof mealHistoryQuerySchema>;
