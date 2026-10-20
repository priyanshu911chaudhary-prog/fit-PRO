import { BrowserContext } from "@playwright/test";
import mongoose from "mongoose";
import { User, Profile, Bmi, WaterLog, WorkoutLog, MealLog } from "@/models";
import { connectDB } from "@/lib/db";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";

export interface E2EUserSession {
  userId: string;
  email: string;
  fullName: string;
  accessToken: string;
  refreshToken: string;
}

export async function ensureDbConnected() {
  if (mongoose.connection.readyState !== 1) {
    if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
      process.env.MONGODB_URI = process.env.MONGO_URI;
    }
    await connectDB();
  }
}

export async function createVerifiedE2EUser(options?: {
  withProfile?: boolean;
  prefix?: string;
}): Promise<E2EUserSession> {
  await ensureDbConnected();

  const timestamp = Date.now() + "_" + Math.floor(Math.random() * 10000);
  const email = `${options?.prefix || "e2e_athlete"}_${timestamp}@fitpro.test`;
  const fullName = "E2E Showcase Athlete";

  const user = new User({
    fullName,
    email,
    password: "Password123!",
    isVerified: true,
  });
  await user.save();

  if (options?.withProfile) {
    const profile = new Profile({
      user: user._id,
      gender: "male",
      dob: new Date("1996-06-20"),
      height: 180,
      weight: 76,
      activityLevel: "moderately_active",
      fitnessGoal: "muscle_building",
      dietaryPreference: "none",
      experienceLevel: "intermediate",
      isProfileComplete: true,
    });
    await profile.save();

    const bmiLog = new Bmi({
      user: user._id,
      height: 180,
      weight: 76,
      bmi: 23.5,
      category: "normal",
      date: new Date(),
    });
    await bmiLog.save();
  }

  const accessToken = await signAccessToken({
    userId: user._id.toString(),
    email: user.email,
  });

  const refreshToken = await signRefreshToken({
    userId: user._id.toString(),
    email: user.email,
  });

  return {
    userId: user._id.toString(),
    email,
    fullName,
    accessToken,
    refreshToken,
  };
}

export async function injectAuthSession(
  context: BrowserContext,
  session: E2EUserSession,
  baseUrl = "http://localhost:3000"
) {
  const domain = new URL(baseUrl).hostname;

  await context.addCookies([
    {
      name: "accessToken",
      value: session.accessToken,
      domain,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "refreshToken",
      value: session.refreshToken,
      domain,
      path: "/api/auth",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function cleanupE2EUser(userId: string) {
  try {
    await ensureDbConnected();
    const oid = new mongoose.Types.ObjectId(userId);
    await WaterLog.deleteMany({ user: oid });
    await WorkoutLog.deleteMany({ user: oid });
    await MealLog.deleteMany({ user: oid });
    await Bmi.deleteMany({ user: oid });
    await Profile.deleteMany({ user: oid });
    await User.deleteOne({ _id: oid });
  } catch {
    // Ignore cleanup errors
  }
}
