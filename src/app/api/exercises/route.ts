import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withHandler } from "@/lib/api/with-handler";
import { getCachedExerciseCatalog } from "@/lib/catalog/cached-catalog";
import { Exercise } from "@/models/exercise";

export const GET = withHandler(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const targetMuscle = searchParams.get("targetMuscle")?.trim();
  const equipment = searchParams.get("equipment")?.trim();
  const category = searchParams.get("category")?.trim();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 20));

  try {
    const allExercises = await getCachedExerciseCatalog();

    let filtered = allExercises;
    if (q) {
      const lowerQ = q.toLowerCase();
      filtered = filtered.filter((ex) => {
        if (ex.name.toLowerCase().includes(lowerQ)) return true;
        return (ex.aliases || []).some((a) => a.toLowerCase().includes(lowerQ));
      });
    }
    if (targetMuscle) {
      filtered = filtered.filter((ex) => ex.targetMuscle === targetMuscle);
    }
    if (equipment) {
      filtered = filtered.filter((ex) => ex.equipment === equipment);
    }
    if (category) {
      filtered = filtered.filter((ex) => ex.category === category);
    }

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const exercises = filtered.slice(skip, skip + limit);

    return NextResponse.json(
      new ApiResponse(200, "Exercises fetched successfully", {
        exercises,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      }),
      { status: 200 }
    );
  } catch {
    // Graceful fallback to direct MongoDB query if snapshot resolution fails
    const filter: Record<string, unknown> = {};

    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = { $regex: escaped, $options: "i" };
      filter.$or = [{ name: regex }, { aliases: regex }];
    }
    if (targetMuscle) filter.targetMuscle = targetMuscle;
    if (equipment) filter.equipment = equipment;
    if (category) filter.category = category;

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
  }
});
