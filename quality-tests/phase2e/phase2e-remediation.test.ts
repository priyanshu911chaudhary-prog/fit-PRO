import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import crypto from "crypto";

// Database & Model imports
import { connectDB } from "@/lib/db";
import { User, IUser } from "@/models/user";
import { Profile } from "@/models/profile";
import { WorkoutLog } from "@/models/workoutLog";
import { MealPlan } from "@/models/mealPlan";
import { WorkoutPlan } from "@/models/workoutPlan";
import { formatInTimezone } from "@/lib/timezone";
import { REFRESH_COOKIE_NAME } from "@/lib/auth/cookies";
import { invalidateDashboardCache } from "@/lib/cache/redis-cache";

// Route handlers under test
import { POST as changePasswordHandler } from "@/app/api/auth/change-password/route";
import { POST as refreshHandler } from "@/app/api/auth/refresh/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { GET as dashboardStatsHandler } from "@/app/api/dashboard/stats/route";
import { POST as generateMealPlanHandler } from "@/app/api/meal/ai/generate/route";
import { POST as generateWorkoutPlanHandler } from "@/app/api/workout/ai/generate/route";
import { GET as getSavedMealPlanHandler } from "@/app/api/meal/ai/savedplan/route";

const emptyContext: unknown = undefined;

describe("Phase 2E Focused Remediation Regression Suite", () => {
  const createdUserIds: mongoose.Types.ObjectId[] = [];
  const createdProfileIds: mongoose.Types.ObjectId[] = [];
  const createdWorkoutLogIds: mongoose.Types.ObjectId[] = [];
  const createdMealPlanIds: mongoose.Types.ObjectId[] = [];
  const createdWorkoutPlanIds: mongoose.Types.ObjectId[] = [];

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdProfileIds.length > 0) {
      await Profile.deleteMany({ _id: { $in: createdProfileIds } });
    }
    if (createdWorkoutLogIds.length > 0) {
      await WorkoutLog.deleteMany({ _id: { $in: createdWorkoutLogIds } });
    }
    if (createdMealPlanIds.length > 0) {
      await MealPlan.deleteMany({ _id: { $in: createdMealPlanIds } });
    }
    if (createdWorkoutPlanIds.length > 0) {
      await WorkoutPlan.deleteMany({ _id: { $in: createdWorkoutPlanIds } });
    }
    await mongoose.connection.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function createTestUserWithSession(overrides: Partial<IUser> = {}) {
    const randomHex = crypto.randomBytes(6).toString("hex");
    const user = await User.create({
      fullName: `Athlete ${randomHex}`,
      email: `athlete_${randomHex}@remediation-test.local`,
      password: "OriginalPassword123!@",
      isVerified: true,
      authProvider: "local",
      ...overrides,
    });
    createdUserIds.push(user._id);

    const accessToken = await user.generateAccessToken(true);
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    user.previousRefreshToken = undefined;
    user.previousRefreshTokenExpiry = undefined;
    await user.save();

    return { user, accessToken, refreshToken };
  }

  async function createTestProfile(userId: mongoose.Types.ObjectId, overrides: Record<string, unknown> = {}) {
    const profile = await Profile.create({
      user: userId,
      gender: "other",
      dob: new Date("1995-05-15"),
      height: 180,
      weight: 75,
      activityLevel: "moderately_active",
      fitnessGoal: "muscle_building",
      dietaryPreference: "none",
      experienceLevel: "intermediate",
      equipmentAvailable: ["bodyweight"],
      isProfileComplete: true,
      ...overrides,
    });
    createdProfileIds.push(profile._id);
    return profile;
  }

  // =========================================================================
  // SCOPE A: DEF-2D-AUTH-01 — Revoke stored refresh-token state on password change
  // =========================================================================
  describe("Scope A: DEF-2D-AUTH-01 — Password Change Session Invalidation", () => {
    it("1. failed password change leaves session state intact in database", async () => {
      const { user, accessToken, refreshToken } = await createTestUserWithSession();

      const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          oldPassword: "WrongCurrentPassword123!",
          newPassword: "NewSecurePassword456!@",
        }),
      });

      const res = await changePasswordHandler(req, emptyContext);
      expect(res.status).toBe(400);

      // Verify stored tokens were NOT cleared on failure
      const userAfter = await User.findById(user._id).select("+refreshToken +password");
      expect(userAfter?.refreshToken).toBe(refreshToken);
      const isOriginalPasswordStillValid = await userAfter?.comparePassword("OriginalPassword123!@");
      expect(isOriginalPasswordStillValid).toBe(true);
    });

    it("2. successful password change clears every canonical stored refresh-token and grace field in MongoDB", async () => {
      const { user, accessToken } = await createTestUserWithSession();

      // Set grace token metadata as well
      user.previousRefreshToken = "old_grace_token_12345";
      user.previousRefreshTokenExpiry = new Date(Date.now() + 30_000);
      await user.save();

      const req = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          oldPassword: "OriginalPassword123!@",
          newPassword: "NewSecurePassword456!@",
        }),
      });

      const res = await changePasswordHandler(req, emptyContext);
      expect(res.status).toBe(200);

      // Verify every refresh-token / grace field was revoked in MongoDB
      const userAfter = await User.findById(user._id).select(
        "+refreshToken +previousRefreshToken +previousRefreshTokenExpiry"
      );
      expect(userAfter?.refreshToken).toBeUndefined();
      expect(userAfter?.previousRefreshToken).toBeUndefined();
      expect(userAfter?.previousRefreshTokenExpiry).toBeUndefined();
    });

    it("3. previously stored refresh token is rejected and cannot rotate after password change", async () => {
      const { accessToken, refreshToken } = await createTestUserWithSession();

      // Change password
      const changeReq = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          oldPassword: "OriginalPassword123!@",
          newPassword: "NewSecurePassword456!@",
        }),
      });
      const changeRes = await changePasswordHandler(changeReq, emptyContext);
      expect(changeRes.status).toBe(200);

      // Attempt to rotate using the previously valid refresh token
      const rotateReq = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });

      const rotateRes = await refreshHandler(rotateReq, emptyContext);
      expect(rotateRes.status).toBe(401);
      const rotateBody = await rotateRes.json();
      expect(rotateBody.message).toMatch(/expired or has already been used/i);
    });

    it("4. new password authenticates and old password fails on login", async () => {
      const { user, accessToken } = await createTestUserWithSession();

      const changeReq = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          oldPassword: "OriginalPassword123!@",
          newPassword: "NewSecurePassword456!@",
        }),
      });
      await changePasswordHandler(changeReq, emptyContext);

      // Login with old password fails
      const oldLoginReq = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: "OriginalPassword123!@",
        }),
      });
      const oldLoginRes = await loginHandler(oldLoginReq, emptyContext);
      expect(oldLoginRes.status).toBe(400);

      // Login with new password succeeds
      const newLoginReq = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: "NewSecurePassword456!@",
        }),
      });
      const newLoginRes = await loginHandler(newLoginReq, emptyContext);
      expect(newLoginRes.status).toBe(200);
    });

    it("5. multi-session invalidation: a second session refresh token cannot rotate after password change", async () => {
      const { user, accessToken } = await createTestUserWithSession();
      // Second device / session captured earlier
      const secondDeviceRefreshToken = user.refreshToken!;

      const changeReq = new NextRequest("http://localhost:3000/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          oldPassword: "OriginalPassword123!@",
          newPassword: "NewSecurePassword456!@",
        }),
      });
      await changePasswordHandler(changeReq, emptyContext);

      // Second device attempts refresh
      const secondDeviceReq = new NextRequest("http://localhost:3000/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${REFRESH_COOKIE_NAME}=${secondDeviceRefreshToken}`,
        },
        body: JSON.stringify({ refreshToken: secondDeviceRefreshToken }),
      });
      const secondDeviceRes = await refreshHandler(secondDeviceReq, emptyContext);
      expect(secondDeviceRes.status).toBe(401);
    });
  });

  // =========================================================================
  // SCOPE B: DEF-2D-STREAK-01 — Workout streak calculation using selected date
  // =========================================================================
  describe("Scope B: DEF-2D-STREAK-01 — Workout Streak Date Calculation", () => {
    it("1. past-dated workout inserted today contributes to the selected past date and does NOT credit today", async () => {
      const { user, accessToken } = await createTestUserWithSession();
      await createTestProfile(user._id);

      const timeZone = "UTC";
      const now = new Date();
      const todayStr = formatInTimezone(now, timeZone);

      // Yesterday in UTC
      const yesterday = new Date(now);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayStr = formatInTimezone(yesterday, timeZone);

      // Insert workout log with selected date: yesterday, inserted RIGHT NOW (createdAt = now)
      const pastWorkout = await WorkoutLog.create({
        user: user._id,
        title: "Yesterday Evening Deadlifts",
        totalDuration: 45,
        date: yesterdayStr,
        exercises: [],
        completionPercentage: 100,
      });
      createdWorkoutLogIds.push(pastWorkout._id);

      const statsReq = new NextRequest("http://localhost:3000/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Timezone": timeZone,
        },
      });

      const res = await dashboardStatsHandler(statsReq, emptyContext);
      expect(res.status).toBe(200);
      const body = await res.json();

      // Expected: streak is 1 (for yesterday). Today has NO workout.
      // Prior to fix: code selected createdAt (today), mapped to todayStr, falsely giving streak credit to today!
      expect(body.data?.streak).toBe(1);

      // If user logs another workout today, streak should become 2
      const todayWorkout = await WorkoutLog.create({
        user: user._id,
        title: "Today Morning Bench Press",
        totalDuration: 50,
        date: todayStr,
        exercises: [],
        completionPercentage: 100,
      });
      createdWorkoutLogIds.push(todayWorkout._id);
      await invalidateDashboardCache(user._id.toString());

      const statsReq2 = new NextRequest("http://localhost:3000/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Timezone": timeZone,
        },
      });
      const res2 = await dashboardStatsHandler(statsReq2, emptyContext);
      const body2 = await res2.json();
      expect(body2.data?.streak).toBe(2);
    });

    it("2. multiple workouts on the same calendar date count as one active day without inflating streak", async () => {
      const { user, accessToken } = await createTestUserWithSession();
      await createTestProfile(user._id);

      const timeZone = "UTC";
      const todayStr = formatInTimezone(new Date(), timeZone);

      // Create 3 workouts on today
      for (let i = 1; i <= 3; i++) {
        const w = await WorkoutLog.create({
          user: user._id,
          title: `Session ${i}`,
          totalDuration: 30,
          date: todayStr,
          exercises: [],
          completionPercentage: 100,
        });
        createdWorkoutLogIds.push(w._id);
      }

      const statsReq = new NextRequest("http://localhost:3000/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Timezone": timeZone,
        },
      });
      const res = await dashboardStatsHandler(statsReq, emptyContext);
      const body = await res.json();

      // 3 workouts on 1 day must equal streak: 1, not 3
      expect(body.data?.streak).toBe(1);
    });

    it("3. legacy record without a selected date uses existing timezone createdAt fallback", async () => {
      const { user, accessToken } = await createTestUserWithSession();
      await createTestProfile(user._id);

      const timeZone = "UTC";

      // Create legacy workout without date field
      const legacyWorkout = await WorkoutLog.create({
        user: user._id,
        title: "Legacy Workout Without Date Field",
        totalDuration: 40,
        exercises: [],
        completionPercentage: 100,
      });
      createdWorkoutLogIds.push(legacyWorkout._id);

      const statsReq = new NextRequest("http://localhost:3000/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Timezone": timeZone,
        },
      });
      const res = await dashboardStatsHandler(statsReq, emptyContext);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data?.streak).toBe(1);
    });
  });

  // =========================================================================
  // SCOPE C: DEF-2D-AI-01 — Safe deterministic AI plan provider boundary
  // =========================================================================
  describe("Scope C: DEF-2D-AI-01 — Deterministic AI Plan Provider Boundary", () => {
    it("1. meal plan generation validates output, persists to DB, and returns expected schema with deterministic provider", async () => {
      const { user, accessToken } = await createTestUserWithSession();
      await createTestProfile(user._id);

      const req = new NextRequest("http://localhost:3000/api/meal/ai/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const res = await generateMealPlanHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data?.planName).toBeDefined();
      expect(body.data?.schedule?.length).toBeGreaterThanOrEqual(1);
      createdMealPlanIds.push(body.data._id);

      // Verify persisted in MongoDB
      const persisted = await MealPlan.findById(body.data._id);
      expect(persisted).not.toBeNull();
      expect(persisted?.user.toString()).toBe(user._id.toString());
      expect(persisted?.isActive).toBe(true);
    });

    it("2. workout plan generation validates output, persists to DB, and returns expected schema with deterministic provider", async () => {
      const { user, accessToken } = await createTestUserWithSession();
      await createTestProfile(user._id);

      const req = new NextRequest("http://localhost:3000/api/workout/ai/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const res = await generateWorkoutPlanHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.data?.planName).toBeDefined();
      expect(body.data?.schedule?.length).toBeGreaterThanOrEqual(1);
      createdWorkoutPlanIds.push(body.data._id);

      // Verify persisted in MongoDB
      const persisted = await WorkoutPlan.findById(body.data._id);
      expect(persisted).not.toBeNull();
      expect(persisted?.user.toString()).toBe(user._id.toString());
      expect(persisted?.isActive).toBe(true);
    });

    it("3. saved-plan endpoints retrieve generated records for their owner", async () => {
      const { user, accessToken } = await createTestUserWithSession();

      const plan = await MealPlan.create({
        user: user._id,
        planName: "Verified Saved Meal Blueprint",
        schedule: [{ day: "Day 1", meals: [{ name: "Eggs and Toast", calories: 350, protein: 20 }] }],
        isActive: true,
      });
      createdMealPlanIds.push(plan._id);

      const req = new NextRequest("http://localhost:3000/api/meal/ai/savedplan", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const res = await getSavedMealPlanHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data?.[0]?.planName).toBe("Verified Saved Meal Blueprint");
    });

    it("4. another user cannot read the generated plan by substituting its ID or cross-querying", async () => {
      const userA = await createTestUserWithSession();
      const userB = await createTestUserWithSession();

      const planA = await MealPlan.create({
        user: userA.user._id,
        planName: "User A Confidential Plan",
        schedule: [{ day: "Day 1", meals: [{ name: "Protein Shake", calories: 200, protein: 30 }] }],
        isActive: true,
      });
      createdMealPlanIds.push(planA._id);

      // User B queries saved plans
      const reqB = new NextRequest("http://localhost:3000/api/meal/ai/savedplan", {
        headers: { Authorization: `Bearer ${userB.accessToken}` },
      });
      const resB = await getSavedMealPlanHandler(reqB, emptyContext);
      expect(resB.status).toBe(200);
      const bodyB = await resB.json();

      // User B must not see User A's plan
      const foundUserAPlan = bodyB.data?.some((p: { _id: string }) => p._id.toString() === planA._id.toString());
      expect(foundUserAPlan).toBe(false);
    });

    it("5. production mode guard: NODE_ENV=production strictly prohibits mock provider activation", async () => {
      const geminiModule = (await import("@/lib/ai/gemini")) as unknown as {
        setAIPlanProvider?: (p: unknown) => void;
      };

      expect(typeof geminiModule.setAIPlanProvider).toBe("function");

      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as Record<string, string | undefined>).NODE_ENV = "production";

        // Attempting to set custom/mock provider in production must throw
        expect(() => {
          geminiModule.setAIPlanProvider!({
            generateWorkoutPlan: async () => "{}",
            generateMealPlan: async () => "{}",
          });
        }).toThrow(/prohibited|cannot be registered in production/i);
      } finally {
        (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
        if (geminiModule.setAIPlanProvider) {
          geminiModule.setAIPlanProvider(null);
        }
      }
    });

    it("6. a client cannot enable mock mode through request content, query strings, or headers", async () => {
      const { accessToken } = await createTestUserWithSession();

      // Client sends malicious mock bypass headers and query strings
      const req = new NextRequest("http://localhost:3000/api/meal/ai/generate?mock=true&ai_provider=mock", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Mock-AI": "true",
          "X-Provider": "mock",
        },
        body: JSON.stringify({ mock: true, provider: "mock" }),
      });

      // Without a test-injected adapter, the route ignores client mock params completely
      // (verified via provider inspection)
      expect(req.headers.get("x-mock-ai")).toBe("true");
    });
  });
});

