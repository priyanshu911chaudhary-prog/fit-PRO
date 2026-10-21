import { z } from "zod";
import { normalizeDateOnly } from "@/lib/nutrition-engine";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const mealItemSchema = z.preprocess((val: unknown) => {
  if (typeof val === "object" && val !== null) {
    const item = val as Record<string, unknown>;
    const foodItemId = item.foodItemId || item.foodItem || item.foodId || item._id;

    // Only default quantity to 1 when genuinely omitted (undefined)
    let quantity: unknown = item.quantity;
    if (quantity === undefined) {
      quantity = 1;
    } else if (typeof quantity === "string" && quantity.trim() !== "") {
      const parsed = Number(quantity);
      // Preserve invalid string so Zod rejects with "Quantity must be a number"
      quantity = Number.isNaN(parsed) ? quantity : parsed;
    }

    const unit = typeof item.unit === "string" ? item.unit.trim().toLowerCase() : "serving";
    const servingSize =
      typeof item.servingSize === "string" && item.servingSize.trim().length > 0
        ? item.servingSize
        : `${quantity} ${unit}`;

    return {
      foodItemId,
      quantity,
      unit,
      servingSize,
      calories: typeof item.calories === "number" ? item.calories : undefined,
    };
  }
  return val;
}, z.object({
  foodItemId: z
    .string()
    .regex(objectIdRegex, "Invalid food item ID format"),
  quantity: z
    .number({ message: "Quantity must be a number" })
    .min(0.01, "Quantity must be greater than 0")
    .max(10000, "Quantity is too large")
    .default(1),
  unit: z.string().min(1, "Unit cannot be empty").max(20, "Unit is too long").default("serving"),
  servingSize: z
    .string()
    .min(1, "Serving size cannot be empty")
    .max(50, "Serving size cannot exceed 50 characters")
    .default("1 serving"),
  calories: z.number().min(0).max(50000).optional(),
}));

export const logMealSchema = z.preprocess((val: unknown) => {
  if (typeof val === "object" && val !== null) {
    const data = val as Record<string, unknown>;
    const rawMealType = (data.mealType as string)?.toLowerCase() || "breakfast";
    const mealType = ["breakfast", "lunch", "dinner", "snack"].includes(rawMealType)
      ? rawMealType
      : "breakfast";

    const rawTitle = data.title || mealType;
    const title =
      typeof rawTitle === "string" && rawTitle.trim().length > 0
        ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)
        : mealType.charAt(0).toUpperCase() + mealType.slice(1);

    const rawMeals = Array.isArray(data.meals)
      ? data.meals
      : Array.isArray(data.items)
      ? data.items
      : [];

    const consumedDate =
      typeof data.consumedDate === "string" && data.consumedDate.trim().length > 0
        ? normalizeDateOnly(data.consumedDate)
        : typeof data.date === "string" && data.date.trim().length > 0
        ? normalizeDateOnly(data.date)
        : normalizeDateOnly();

    return {
      ...data,
      title,
      mealType,
      consumedDate,
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
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("breakfast"),
  consumedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
    .default(() => normalizeDateOnly()),
  meals: z.array(mealItemSchema).min(1, "At least one meal item must be logged"),
  totalCalories: z.number().min(0).optional(),
  completionPercentage: z.number().min(0).max(100).default(100),
}));

export const mealHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type MealItemInput = z.infer<typeof mealItemSchema>;
export type LogMealInput = z.infer<typeof logMealSchema>;
export type MealHistoryQueryInput = z.infer<typeof mealHistoryQuerySchema>;
