import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { getCachedFoodCatalog } from "@/lib/catalog/cached-catalog";
import { FoodItem } from "@/models/foodItem";

export const GET = withHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const mealType = searchParams.get("mealType")?.trim();
  const dietaryPreference = searchParams.get("dietaryPreference")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 30));

  try {
    const allFoods = await getCachedFoodCatalog();

    let filtered = allFoods.filter((f) => f.isActive !== false);

    if (q) {
      const lowerQ = q.toLowerCase();
      filtered = filtered.filter((food) => {
        if (food.name.toLowerCase().includes(lowerQ)) return true;
        return (food.aliases || []).some((alias) => alias.toLowerCase().includes(lowerQ));
      });
    }

    if (category && category !== "all") {
      filtered = filtered.filter((food) => food.category === category);
    }

    if (mealType && mealType !== "all") {
      filtered = filtered.filter((food) => food.mealType === mealType || food.mealType === "any");
    }

    if (dietaryPreference && dietaryPreference !== "none" && dietaryPreference !== "all") {
      filtered = filtered.filter((food) => food.dietaryPreference === dietaryPreference);
    }

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const foods = filtered.slice(skip, skip + limit);

    return NextResponse.json(
      new ApiResponse(200, "Food items fetched successfully", {
        foods,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }),
      { status: 200 }
    );
  } catch {
    // Graceful fallback to direct MongoDB query if snapshot resolution fails
    const filter: Record<string, unknown> = {
      isActive: { $ne: false },
    };

    if (q) {
      const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escapedQuery, $options: "i" };
      filter.$or = [{ name: regex }, { aliases: regex }];
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (mealType && mealType !== "all") {
      filter.mealType = { $in: [mealType, "any"] };
    }

    if (dietaryPreference && dietaryPreference !== "none" && dietaryPreference !== "all") {
      filter.dietaryPreference = dietaryPreference;
    }

    const skip = (page - 1) * limit;

    const [foods, total] = await Promise.all([
      FoodItem.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      FoodItem.countDocuments(filter),
    ]);

    return NextResponse.json(
      new ApiResponse(200, "Food items fetched successfully", {
        foods,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }),
      { status: 200 }
    );
  }
});

