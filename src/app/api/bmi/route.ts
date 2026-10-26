
import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { TokenPayload } from "@/lib/auth/jwt";
import { calculateBMI } from "@/lib/fitness-calc";
import { formatInTimezone, getUserTimezone } from "@/lib/timezone";
import { Bmi } from "@/models/bmi";
import { Profile } from "@/models/profile";
import { logBmiSchema } from "@/validators/bmi.validator";
import { invalidateDashboardCache } from "@/lib/cache/redis-cache";

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;
    const body = await validateBody(req, logBmiSchema);

    const { bmi, category } = calculateBMI(body.weight, body.height);

    const bmiRecord = await Bmi.create({
      user: userId,
      weight: body.weight,
      height: body.height,
      bmi,
      category,
      date: body.date || new Date(),
    });

    // Update profile weight & height with runValidators: true (Approved Fix 3)
    await Profile.findOneAndUpdate(
      { user: userId },
      { weight: body.weight, height: body.height },
      { runValidators: true }
    );

    try {
      await invalidateDashboardCache(userId);
    } catch {
      // Safe fallback if Redis is unavailable
    }

    return NextResponse.json(
      new ApiResponse(201, "BMI logged successfully.", bmiRecord),
      { status: 201 }
    );
  })
);

export const GET = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const userId = sessionUser.userId;
    const timeZone = getUserTimezone(req);

    let history = await Bmi.find({ user: userId })
      .sort({ date: -1 })
      .limit(30)
      .select("weight height bmi category date createdAt");

    // If no BMI records exist yet, auto-seed baseline from user profile so trajectory and history are available
    if (!history || history.length === 0) {
      const profile = await Profile.findOne({ user: userId });
      if (profile && profile.weight && profile.height) {
        const { bmi, category } = calculateBMI(profile.weight, profile.height);
        const baseline = await Bmi.create({
          user: userId,
          weight: profile.weight,
          height: profile.height,
          bmi,
          category,
          date: profile.createdAt || new Date(),
        });
        history = [baseline];
      }
    }

    // Approved Fix 8: returns 200 with [] when empty (not 404)
    const chartData = (history || []).map((entry) => {
      const entryDate = entry.date || (entry as unknown as { createdAt?: Date }).createdAt || new Date();
      return {
        id: entry._id.toString(),
        _id: entry._id.toString(),
        date: formatInTimezone(new Date(entryDate), timeZone),
        createdAt: entryDate,
        bmi: entry.bmi,
        weight: entry.weight,
        height: entry.height,
        category: entry.category,
      };
    });

    return NextResponse.json(
      new ApiResponse(200, "BMI history retrieved successfully.", chartData),
      { status: 200 }
    );
  })
);
