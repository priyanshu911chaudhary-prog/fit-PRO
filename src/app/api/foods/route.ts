
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { FoodItem } from "@/models/foodItem";

export const GET = withHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const mealType = searchParams.get("mealType")?.trim();
  const dietaryPreference = searchParams.get("dietaryPreference")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

  const filter: Record<string, unknown> = {};

  if (q) {
    filter.name = { $regex: q, $options: "i" };
  }
  if (mealType) {
    filter.mealType = mealType;
  }
  if (dietaryPreference) {
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
});
