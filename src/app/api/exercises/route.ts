
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { Exercise } from "@/models/exercise";

export const GET = withHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const targetMuscle = searchParams.get("targetMuscle")?.trim();
  const equipment = searchParams.get("equipment")?.trim();
  const category = searchParams.get("category")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 20));

  const filter: Record<string, unknown> = {};

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [{ name: regex }, { aliases: regex }];
  }
  if (targetMuscle) {
    filter.targetMuscle = targetMuscle;
  }
  if (equipment) {
    filter.equipment = equipment;
  }
  if (category) {
    filter.category = category;
  }

  const skip = (page - 1) * limit;

  const [exercises, total] = await Promise.all([
    Exercise.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Exercise.countDocuments(filter),
  ]);

  return NextResponse.json(
    new ApiResponse(200, "Exercises fetched successfully", {
      exercises,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }),
    { status: 200 }
  );
});
