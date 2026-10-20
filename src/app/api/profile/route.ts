
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/api-error";
import { ApiResponse } from "@/lib/api/api-response";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { validateBody } from "@/lib/api/with-validation";
import { setAuthCookies } from "@/lib/auth/cookies";
import { TokenPayload, signAccessToken } from "@/lib/auth/jwt";
import { calculateAge, calculateBMI, getFitnessMetrics } from "@/lib/fitness-calc";
import { Bmi } from "@/models/bmi";
import { Profile } from "@/models/profile";
import { User } from "@/models/user";
import { profileSetupSchema, profileUpdateSchema } from "@/validators/profile.validator";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const [profile, user] = await Promise.all([
      Profile.findOne({ user: sessionUser.userId }),
      User.findById(sessionUser.userId).select("authProvider"),
    ]);

    if (!profile) {
      return NextResponse.json(
        new ApiResponse(200, "No profile found", {
          profile: null,
          metrics: null,
          isProfileComplete: false,
          authProvider: user?.authProvider || "local",
        }),
        { status: 200 }
      );
    }

    const effectiveAge = calculateAge(profile.dob);
    const metrics = getFitnessMetrics({
      weight: profile.weight,
      height: profile.height,
      dob: profile.dob,
      age: effectiveAge,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
    });

    return NextResponse.json(
      new ApiResponse(200, "Profile retrieved successfully", {
        profile,
        metrics,
        isProfileComplete: profile.isProfileComplete,
        authProvider: user?.authProvider || "local",
      }),
      { status: 200 }
    );
  })
);

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const data = await validateBody(req, profileSetupSchema);
    const userId = sessionUser.userId;

    const effectiveAge = data.age || calculateAge(data.dob);

    let profile = await Profile.findOne({ user: userId });

    if (profile) {
      Object.assign(profile, data);
      profile.age = effectiveAge;
      profile.isProfileComplete = true;
    } else {
      profile = new Profile({
        user: userId,
        ...data,
        age: effectiveAge,
        isProfileComplete: true,
      });
    }

    await profile.save();

    // Approved Fix 4: Create initial day-one BMI record if none exists so charts have data
    const existingBmi = await Bmi.findOne({ user: userId });
    if (!existingBmi) {
      const { bmi, category } = calculateBMI(data.weight, data.height);
      await Bmi.create({
        user: userId,
        weight: data.weight,
        height: data.height,
        bmi,
        category,
        date: new Date(),
      });
    }

    const user = await User.findById(userId);
    const newAccessToken = user
      ? await user.generateAccessToken(true)
      : await signAccessToken({ userId: userId.toString(), email: sessionUser.email, hasProfile: true });

    const response = NextResponse.json(
      new ApiResponse(200, "Profile setup complete. Welcome to the dashboard!", profile),
      { status: 200 }
    );
    setAuthCookies(response, newAccessToken);
    return response;
  })
);

export const PATCH = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    const data = await validateBody(req, profileUpdateSchema);
    const userId = sessionUser.userId;

    const profile = await Profile.findOne({ user: userId });
    if (!profile) {
      throw new ApiError(404, "Profile not found. Please setup your profile first.");
    }

    if (data.dob) {
      profile.dob = data.dob;
      profile.age = calculateAge(data.dob);
    } else if (data.age) {
      profile.age = data.age;
    }

    let weightOrHeightChanged = false;
    if (data.weight !== undefined && data.weight !== profile.weight) {
      profile.weight = data.weight;
      weightOrHeightChanged = true;
    }
    if (data.height !== undefined && data.height !== profile.height) {
      profile.height = data.height;
      weightOrHeightChanged = true;
    }

    if (data.gender) profile.gender = data.gender;
    if (data.fitnessGoal) profile.fitnessGoal = data.fitnessGoal;
    if (data.activityLevel) profile.activityLevel = data.activityLevel;
    if (data.dietaryPreference) profile.dietaryPreference = data.dietaryPreference;
    if (data.experienceLevel) profile.experienceLevel = data.experienceLevel;
    if (data.equipmentAvailable) profile.equipmentAvailable = data.equipmentAvailable;

    await profile.save();

    // If weight or height changed, log a new BMI record
    if (weightOrHeightChanged) {
      const { bmi, category } = calculateBMI(profile.weight, profile.height);
      await Bmi.create({
        user: userId,
        weight: profile.weight,
        height: profile.height,
        bmi,
        category,
        date: new Date(),
      });
    }

    const effectiveAge = profile.age || calculateAge(profile.dob);
    const metrics = getFitnessMetrics({
      weight: profile.weight,
      height: profile.height,
      dob: profile.dob,
      age: effectiveAge,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
    });

    return NextResponse.json(
      new ApiResponse(200, "Profile updated successfully", {
        profile,
        metrics,
        isProfileComplete: profile.isProfileComplete,
      }),
      { status: 200 }
    );
  })
);
