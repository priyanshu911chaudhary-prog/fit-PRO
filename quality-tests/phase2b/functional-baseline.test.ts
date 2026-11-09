import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

// Database & safety
import { connectDB } from "@/lib/db";
import { User, IUser } from "@/models/user";
import { Profile } from "@/models/profile";
import { Bmi } from "@/models/bmi";
import { EmailOutbox } from "@/models/emailOutbox";
import { CoachConversation } from "@/models/coachConversation";

// Tokens & Auth
import { verifyAccessToken } from "@/lib/auth/jwt";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "@/lib/auth/cookies";

// Route handlers under test
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as verifyEmailHandler } from "@/app/api/auth/verify-email/route";
import { GET as verifyEmailTokenHandler } from "@/app/api/auth/verify-email/[token]/route";
import { POST as resendVerificationHandler } from "@/app/api/auth/resend-verification/route";
import { GET as meHandler } from "@/app/api/auth/me/route";
import { GET as profileGetHandler, POST as profilePostHandler, PATCH as profilePatchHandler } from "@/app/api/profile/route";
import { POST as coachStreamHandler } from "@/app/api/coach/route";
import { POST as aiChatHandler } from "@/app/api/ai/chat/route";
import { parseCoachStreamLine } from "@/features/coach/hooks/use-coach-chat";
import * as geminiModule from "@/lib/ai/gemini";

// Rate limiting & Queues
import { checkRateLimit } from "@/lib/api/rate-limit";
import { processEmailOutbox } from "@/workers/processors/email.processor";
import { getRedisClient, ensureRedisConnected } from "@/lib/redis/client";
import { closeQueueConnections } from "@/lib/queues/jobs";

const emptyContext: unknown = undefined;

describe("Phase 2B Functional Correctness Baseline Suite", () => {
  const createdUserIds: mongoose.Types.ObjectId[] = [];
  const createdOutboxIds: mongoose.Types.ObjectId[] = [];
  const createdConvIds: mongoose.Types.ObjectId[] = [];
  const createdRedisKeys: string[] = [];

  beforeAll(async () => {
    await connectDB();
    const redis = getRedisClient();
    await ensureRedisConnected(redis);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
      await Profile.deleteMany({ user: { $in: createdUserIds } });
      await Bmi.deleteMany({ user: { $in: createdUserIds } });
      await CoachConversation.deleteMany({ user: { $in: createdUserIds } });
    }
    if (createdOutboxIds.length > 0) {
      await EmailOutbox.deleteMany({ _id: { $in: createdOutboxIds } });
    }
    if (createdConvIds.length > 0) {
      await CoachConversation.deleteMany({ _id: { $in: createdConvIds } });
    }
    if (createdRedisKeys.length > 0) {
      try {
        const redis = getRedisClient();
        await redis.del(...createdRedisKeys);
      } catch {
        // Best effort
      }
    }
    await closeQueueConnections();
  });

  async function createTestUser(verified = false): Promise<IUser> {
    const id = new mongoose.Types.ObjectId();
    const email = `phase2b-test-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@example.com`;
    const user = await User.create({
      _id: id,
      fullName: "Phase2B Athlete",
      email,
      password: "SecurePassword123!",
      isVerified: verified,
      authProvider: "local",
    });
    createdUserIds.push(id);
    return user;
  }

  // =========================================================================
  // Area A: Email Verification
  // =========================================================================
  describe("Area A: Email Verification Baseline", () => {
    it("registration creates unverified user and enqueues outbox verification email", async () => {
      const email = `phase2b-reg-${Date.now()}@example.com`;
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Registration Tester",
          email,
          password: "SecurePassword123!",
        }),
      });

      const res = await registerHandler(req, emptyContext);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(email);
      expect(json.data.user.isVerified).toBe(false);

      const dbUser = await User.findOne({ email }).select("+emailVerificationToken +emailVerificationTokenExpiry");
      expect(dbUser).not.toBeNull();
      createdUserIds.push(dbUser!._id);
      expect(dbUser!.isVerified).toBe(false);
      expect(dbUser!.emailVerificationToken).toBeTruthy();
      expect(dbUser!.emailVerificationTokenExpiry).toBeTruthy();

      const outbox = await EmailOutbox.findOne({ recipientEmail: email });
      expect(outbox).not.toBeNull();
      if (outbox) createdOutboxIds.push(outbox._id);
      expect(outbox?.template).toBe("verification");
      expect(outbox?.status).toBe("pending");
    });

    it("verifies account and clears token when valid verification token is submitted via POST", async () => {
      const user = await createTestUser(false);
      const { unhasedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken(24 * 60 * 60 * 1000);
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpiry = tokenExpiry;
      await user.save();

      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unhasedToken }),
      });

      const res = await verifyEmailHandler(req, emptyContext);
      expect(res.status).toBe(200);

      const updated = await User.findById(user._id).select("+emailVerificationToken +emailVerificationTokenExpiry");
      expect(updated?.isVerified).toBe(true);
      expect(updated?.emailVerificationToken).toBeFalsy();
      expect(updated?.emailVerificationTokenExpiry).toBeFalsy();
    });

    it("rejects already-used or replay verification tokens", async () => {
      const user = await createTestUser(false);
      const { unhasedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken(24 * 60 * 60 * 1000);
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpiry = tokenExpiry;
      await user.save();

      // First call consumes token
      const req1 = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unhasedToken }),
      });
      const res1 = await verifyEmailHandler(req1, emptyContext);
      expect(res1.status).toBe(200);

      // Replay attempt must be rejected
      const req2 = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unhasedToken }),
      });
      const res2 = await verifyEmailHandler(req2, emptyContext);
      expect(res2.status).toBe(400);
      const json2 = await res2.json();
      expect(json2.message).toContain("invalid or has already been used");
    });

    it("rejects missing or empty verification token", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "   " }),
      });

      const res = await verifyEmailHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("token is required");
    });

    it("rejects login for unverified local user with clear message", async () => {
      const user = await createTestUser(false);

      const req = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: "SecurePassword123!",
        }),
      });

      const res = await loginHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Email not verified");
    });

    it("resend-verification issues a new token and outbox record", async () => {
      const user = await createTestUser(false);

      const req = new NextRequest("http://localhost:3000/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const res = await resendVerificationHandler(req, emptyContext);
      expect(res.status).toBe(200);

      const updated = await User.findById(user._id).select("+emailVerificationToken");
      expect(updated?.emailVerificationToken).toBeTruthy();

      const outbox = await EmailOutbox.findOne({ recipientEmail: user.email });
      expect(outbox).not.toBeNull();
      if (outbox) createdOutboxIds.push(outbox._id);
      expect(outbox?.template).toBe("verification");
    });

    // --- SCOPE A: DEF-2B-EMAIL-01 Fixed Verification Tests ---
    it("DEF-2B-EMAIL-01: rejects expired email verification token in POST /api/auth/verify-email", async () => {
      const user = await createTestUser(false);
      // Generate expired token (-2 hours in the past)
      const { unhasedToken, hashedToken } = user.generateTemporaryToken(-2 * 60 * 60 * 1000);
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpiry = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await user.save();

      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unhasedToken }),
      });

      const res = await verifyEmailHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("expired");

      const inDb = await User.findById(user._id);
      expect(inDb?.isVerified).toBe(false);
    });

    it("DEF-2B-EMAIL-01: rejects expired email verification token in GET /api/auth/verify-email/[token]", async () => {
      const user = await createTestUser(false);
      const { unhasedToken, hashedToken } = user.generateTemporaryToken(-2 * 60 * 60 * 1000);
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpiry = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await user.save();

      const req = new NextRequest(`http://localhost:3000/api/auth/verify-email/${unhasedToken}`);
      const res = await verifyEmailTokenHandler(req, {
        params: Promise.resolve({ token: unhasedToken }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("expired");

      const inDb = await User.findById(user._id);
      expect(inDb?.isVerified).toBe(false);
    });

    it("DEF-2B-EMAIL-01: safely rejects token when emailVerificationTokenExpiry is missing", async () => {
      const user = await createTestUser(false);
      const { unhasedToken, hashedToken } = user.generateTemporaryToken(24 * 60 * 60 * 1000);
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpiry = undefined;
      await user.save();

      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unhasedToken }),
      });

      const res = await verifyEmailHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("expired");
    });

    it("DEF-2B-EMAIL-01: ensures another user cannot be verified using a wrong token", async () => {
      const userA = await createTestUser(false);
      const userB = await createTestUser(false);

      const { unhasedToken, hashedToken, tokenExpiry } = userA.generateTemporaryToken(24 * 60 * 60 * 1000);
      userA.emailVerificationToken = hashedToken;
      userA.emailVerificationTokenExpiry = tokenExpiry;
      await userA.save();

      // Submit User A's token
      const req = new NextRequest("http://localhost:3000/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: unhasedToken }),
      });

      const res = await verifyEmailHandler(req, emptyContext);
      expect(res.status).toBe(200);

      const updatedA = await User.findById(userA._id);
      const updatedB = await User.findById(userB._id);

      expect(updatedA?.isVerified).toBe(true);
      expect(updatedB?.isVerified).toBe(false);
    });
  });

  // =========================================================================
  // Area B: User Profile and Onboarding Persistence
  // =========================================================================
  describe("Area B: User Profile and Onboarding Persistence Baseline", () => {
    it("GET /api/profile returns isProfileComplete: false when profile has not been created", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(false);

      const req = new NextRequest("http://localhost:3000/api/profile", {
        headers: { cookie: `${ACCESS_COOKIE_NAME}=${accessToken}` },
      });

      const res = await profileGetHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.profile).toBeNull();
      expect(json.data.isProfileComplete).toBe(false);
    });

    it("POST /api/profile creates profile, auto-seeds day-one BMI, and sets hasProfile: true in cookie", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(false);

      const profilePayload = {
        gender: "male",
        dob: "1995-06-15",
        height: 180,
        weight: 78,
        fitnessGoal: "muscle_building",
        activityLevel: "moderately_active",
        dietaryPreference: "none",
        experienceLevel: "intermediate",
        equipmentAvailable: ["dumbbell", "barbell"],
      };

      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify(profilePayload),
      });

      const res = await profilePostHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.isProfileComplete).toBe(true);
      expect(json.data.height).toBe(180);
      expect(json.data.weight).toBe(78);

      // Verify MongoDB persistence
      const profileInDb = await Profile.findOne({ user: user._id });
      expect(profileInDb).not.toBeNull();
      expect(profileInDb?.isProfileComplete).toBe(true);
      expect(profileInDb?.height).toBe(180);

      // Verify day-one BMI record was auto-seeded
      const bmiInDb = await Bmi.findOne({ user: user._id });
      expect(bmiInDb).not.toBeNull();
      expect(bmiInDb?.weight).toBe(78);
      expect(bmiInDb?.bmi).toBeGreaterThan(0);

      // Verify new access token in set-cookie header has hasProfile: true
      const setCookie = res.headers.get("set-cookie") || "";
      expect(setCookie).toContain(`${ACCESS_COOKIE_NAME}=`);
      const tokenMatch = setCookie.match(new RegExp(`${ACCESS_COOKIE_NAME}=([^;]+)`));
      expect(tokenMatch).not.toBeNull();
      const decoded = await verifyAccessToken(tokenMatch![1]);
      expect(decoded.hasProfile).toBe(true);
    });

    it("GET /api/profile retrieves persisted profile and dynamically recomputed metrics", async () => {
      const user = await createTestUser(true);
      await Profile.create({
        user: user._id,
        gender: "female",
        dob: new Date("1992-04-10"),
        height: 165,
        weight: 60,
        fitnessGoal: "weight_loss",
        activityLevel: "lightly_active",
        dietaryPreference: "vegetarian",
        experienceLevel: "beginner",
        equipmentAvailable: ["bodyweight"],
        isProfileComplete: true,
      });

      const accessToken = await user.generateAccessToken(true);
      const req = new NextRequest("http://localhost:3000/api/profile", {
        headers: { cookie: `${ACCESS_COOKIE_NAME}=${accessToken}` },
      });

      const res = await profileGetHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.profile).not.toBeNull();
      expect(json.data.profile.gender).toBe("female");
      expect(json.data.metrics).toBeDefined();
      expect(json.data.metrics.bmi).toBe(22);
      expect(json.data.metrics.bmr).toBeGreaterThan(1000);
      expect(json.data.metrics.tdee).toBeGreaterThan(json.data.metrics.bmr);
    });

    it("PATCH /api/profile updates weight/height, updates profile, and creates new BMI entry", async () => {
      const user = await createTestUser(true);
      await Profile.create({
        user: user._id,
        gender: "male",
        dob: new Date("1996-01-01"),
        height: 175,
        weight: 70,
        fitnessGoal: "general_fitness",
        activityLevel: "sedentary",
        dietaryPreference: "none",
        experienceLevel: "beginner",
        equipmentAvailable: ["bodyweight"],
        isProfileComplete: true,
      });

      const accessToken = await user.generateAccessToken(true);
      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({ weight: 75 }),
      });

      const res = await profilePatchHandler(req, emptyContext);
      expect(res.status).toBe(200);

      const updatedProfile = await Profile.findOne({ user: user._id });
      expect(updatedProfile?.weight).toBe(75);

      const bmiRecords = await Bmi.find({ user: user._id }).sort({ createdAt: -1 });
      expect(bmiRecords.length).toBeGreaterThan(0);
      expect(bmiRecords[0].weight).toBe(75);
    });

    it("enforces strict user isolation: User A cannot read or modify User B's profile", async () => {
      const userA = await createTestUser(true);
      const userB = await createTestUser(true);

      await Profile.create({
        user: userA._id,
        gender: "male",
        dob: new Date("1990-01-01"),
        height: 180,
        weight: 80,
        fitnessGoal: "muscle_building",
        activityLevel: "moderately_active",
        dietaryPreference: "none",
        experienceLevel: "intermediate",
        equipmentAvailable: ["dumbbell"],
        isProfileComplete: true,
      });

      const tokenB = await userB.generateAccessToken(false);
      const req = new NextRequest("http://localhost:3000/api/profile", {
        headers: { cookie: `${ACCESS_COOKIE_NAME}=${tokenB}` },
      });

      const res = await profileGetHandler(req, emptyContext);
      const json = await res.json();
      // User B must get null profile, not User A's profile
      expect(json.data.profile).toBeNull();
    });

    // --- SCOPE B: DEF-2B-PROFILE-01 Fixed Verification Tests ---
    it("DEF-2B-PROFILE-01: /api/auth/me token refresh preserves previousRefreshToken within 30-second grace window and rejects after expiry", async () => {
      const user = await createTestUser(true);
      const initialRefreshToken = await user.generateRefreshToken();
      user.refreshToken = initialRefreshToken;
      await user.save();

      // Request 1: /api/auth/me with expired access token and valid refresh token
      const req1 = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          cookie: `${ACCESS_COOKIE_NAME}=expired.token; ${REFRESH_COOKIE_NAME}=${initialRefreshToken}`,
        },
      });

      const res1 = await meHandler(req1, emptyContext);
      expect(res1.status).toBe(200);

      // Inspect DB state after /api/auth/me rotation
      const userInDb = await User.findById(user._id).select(
        "+refreshToken +previousRefreshToken +previousRefreshTokenExpiry"
      );

      expect(userInDb?.previousRefreshToken).toBe(initialRefreshToken);
      expect(userInDb?.previousRefreshTokenExpiry).toBeDefined();
      const diffMs = (userInDb?.previousRefreshTokenExpiry?.getTime() || 0) - Date.now();
      expect(diffMs).toBeGreaterThan(20000);
      expect(diffMs).toBeLessThanOrEqual(31000);

      // Request 2: concurrent in-flight request within grace window succeeds
      const req2 = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          cookie: `${ACCESS_COOKIE_NAME}=expired.token; ${REFRESH_COOKIE_NAME}=${initialRefreshToken}`,
        },
      });
      const res2 = await meHandler(req2, emptyContext);
      expect(res2.status).toBe(200);

      // Request 3: request using previousRefreshToken after expiry is rejected (returns guest)
      await User.updateOne(
        { _id: user._id },
        { $set: { previousRefreshTokenExpiry: new Date(Date.now() - 1000) } }
      );

      const req3 = new NextRequest("http://localhost:3000/api/auth/me", {
        headers: {
          cookie: `${ACCESS_COOKIE_NAME}=expired.token; ${REFRESH_COOKIE_NAME}=${initialRefreshToken}`,
        },
      });
      const res3 = await meHandler(req3, emptyContext);
      expect(res3.status).toBe(200);
      const json3 = await res3.json();
      expect(json3.data.user).toBeNull();
    });

    // --- SCOPE F: DOB Validation in Onboarding (SUSP-2B-PROFILE-01) ---
    it("SCOPE-F: rejects malformed date of birth with 400", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(false);

      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          gender: "male",
          dob: "not-a-valid-date",
          height: 175,
          weight: 70,
          fitnessGoal: "general_fitness",
        }),
      });

      const res = await profilePostHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.errors.some((e: string) => /Invalid date|expected date/i.test(e))).toBe(true);
    });

    it("SCOPE-F: rejects future date of birth with 400", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(false);

      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          gender: "male",
          dob: futureDate,
          height: 175,
          weight: 70,
          fitnessGoal: "general_fitness",
        }),
      });

      const res = await profilePostHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.errors.some((e: string) => e.includes("future"))).toBe(true);
    });

    it("SCOPE-F: rejects date of birth for age below 12 with 400", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(false);

      // 8 years old
      const recentDob = new Date(Date.now() - 8 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          gender: "female",
          dob: recentDob,
          height: 140,
          weight: 35,
          fitnessGoal: "general_fitness",
        }),
      });

      const res = await profilePostHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.errors.some((e: string) => e.includes("12 years old"))).toBe(true);
    });

    it("SCOPE-F: accepts exactly age 12 boundary in onboarding with 200", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(false);

      const today = new Date();
      // Exactly 12 years ago today
      const year = today.getFullYear() - 12;
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const exact12Dob = `${year}-${month}-${day}`;

      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          gender: "male",
          dob: exact12Dob,
          height: 155,
          weight: 48,
          fitnessGoal: "general_fitness",
        }),
      });

      const res = await profilePostHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.isProfileComplete).toBe(true);
    });

    it("SCOPE-F: accepts normal adult DOB in onboarding with 200", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(false);

      const req = new NextRequest("http://localhost:3000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          gender: "male",
          dob: "1988-11-20",
          height: 182,
          weight: 82,
          fitnessGoal: "muscle_building",
        }),
      });

      const res = await profilePostHandler(req, emptyContext);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.isProfileComplete).toBe(true);
    });
  });

  // =========================================================================
  // Area C: AI Coach Streaming
  // =========================================================================
  describe("Area C: AI Coach Streaming Baseline", () => {
    it("rejects empty message with 400", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(true);

      const req = new NextRequest("http://localhost:3000/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({ message: "   " }),
      });

      const res = await coachStreamHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Message is required");
    });

    it("rejects message exceeding 2000 characters with 400", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(true);

      const req = new NextRequest("http://localhost:3000/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({ message: "A".repeat(2005) }),
      });

      const res = await coachStreamHandler(req, emptyContext);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("too long");
    });

    it("valid message initiates SSE stream with required headers and disclaimer", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(true);

      const req = new NextRequest("http://localhost:3000/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({ message: "How do I perform a bodyweight squat safely?" }),
      });

      const res = await coachStreamHandler(req, emptyContext);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(res.headers.get("x-health-disclaimer")).toBeTruthy();
      expect(res.headers.get("x-conversation-id")).toBeTruthy();
      expect(res.body).not.toBeNull();
    });

    // --- SCOPE C: DEF-2B-COACH-01 Fixed Verification Tests ---
    it("DEF-2B-COACH-01: parseCoachStreamLine correctly parses SSE error events, chunk data, done, and handles chunk splits", async () => {
      // 1. Error event parsing
      const errorLine = `data: ${JSON.stringify({ error: "AI service temporarily unavailable" })}`;
      const parsedError = parseCoachStreamLine(errorLine);
      expect(parsedError?.error).toBe("AI service temporarily unavailable");
      expect(parsedError?.chunk).toBeUndefined();

      // 2. Normal chunk parsing
      const chunkLine = `data: ${JSON.stringify({ chunk: "Focus on keeping your spine neutral." })}`;
      const parsedChunk = parseCoachStreamLine(chunkLine);
      expect(parsedChunk?.chunk).toBe("Focus on keeping your spine neutral.");

      // 3. Metadata parsing
      const metaLine = `data: ${JSON.stringify({ done: true, conversationId: "65f0123456789abcdef01234", title: "Squat Form" })}`;
      const parsedMeta = parseCoachStreamLine(metaLine);
      expect(parsedMeta?.done).toBe(true);
      expect(parsedMeta?.conversationId).toBe("65f0123456789abcdef01234");
      expect(parsedMeta?.title).toBe("Squat Form");

      // 4. [DONE] stream termination
      const doneLine = "data: [DONE]";
      const parsedDone = parseCoachStreamLine(doneLine);
      expect(parsedDone?.done).toBe(true);

      // 5. Split-chunk line buffering across reader iterations
      let lineBuffer = "";
      const rawSplit1 = 'data: {"err';
      const rawSplit2 = 'or":"Connection timeout"}\n\n';

      // Read chunk 1
      lineBuffer += rawSplit1;
      const lines1 = lineBuffer.split("\n");
      lineBuffer = lines1.pop() ?? "";
      expect(lines1.length).toBe(0); // Kept in buffer

      // Read chunk 2
      lineBuffer += rawSplit2;
      const lines2 = lineBuffer.split("\n");
      lineBuffer = lines2.pop() ?? "";
      const validEvents = lines2.map((l) => l.trim()).filter((l) => l.startsWith("data: "));
      expect(validEvents.length).toBe(1);

      const parsedSplit = parseCoachStreamLine(validEvents[0]);
      expect(parsedSplit?.error).toBe("Connection timeout");
    });

    // --- SCOPE D: DEF-2B-COACH-02 Fixed Verification Tests ---
    it("DEF-2B-COACH-02: prevents duplicate user message on stream fallback and preserves intentional repeats with new turn ID", async () => {
      const user = await createTestUser(true);
      const accessToken = await user.generateAccessToken(true);

      // Mock AI generation so live Gemini is not invoked
      vi.spyOn(geminiModule, "generateCoachChatJSON").mockResolvedValue("Mock AI response");

      const turnId1 = `turn-test-${Date.now()}-1`;
      const promptText = "What is my target heart rate?";

      // Step 1: Client initiates stream call to /api/coach
      const coachReq = new NextRequest("http://localhost:3000/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          message: promptText,
          clientMessageId: turnId1,
        }),
      });

      const coachRes = await coachStreamHandler(coachReq, emptyContext);
      expect(coachRes.status).toBe(200);
      const conversationId = coachRes.headers.get("x-conversation-id")!;
      expect(conversationId).toBeTruthy();

      const convAfterCoach = await CoachConversation.findById(conversationId);
      createdConvIds.push(convAfterCoach!._id);
      expect(convAfterCoach?.messages.length).toBe(1);
      expect(convAfterCoach?.messages[0].role).toBe("user");
      expect(convAfterCoach?.messages[0].clientMessageId).toBe(turnId1);

      // Step 2: Stream simulated failure triggers client fallback to /api/ai/chat with SAME clientMessageId
      const fallbackReq = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          message: promptText,
          conversationId,
          clientMessageId: turnId1,
        }),
      });

      const fallbackRes = await aiChatHandler(fallbackReq, emptyContext);
      expect(fallbackRes.status).toBe(200);

      const convAfterFallback = await CoachConversation.findById(conversationId);
      const userMessages = convAfterFallback?.messages.filter((m) => m.role === "user");

      // Verify idempotency: User message is NOT duplicated! Exactly 1 user message exists!
      expect(userMessages?.length).toBe(1);
      expect(convAfterFallback?.messages.some((m) => m.role === "assistant")).toBe(true);

      // Step 3: User intentionally repeats the SAME prompt text in a subsequent turn with NEW clientMessageId
      const turnId2 = `turn-test-${Date.now()}-2`;
      const secondTurnReq = new NextRequest("http://localhost:3000/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: `${ACCESS_COOKIE_NAME}=${accessToken}`,
        },
        body: JSON.stringify({
          message: promptText,
          conversationId,
          clientMessageId: turnId2,
        }),
      });

      const secondTurnRes = await aiChatHandler(secondTurnReq, emptyContext);
      expect(secondTurnRes.status).toBe(200);

      const convAfterSecondTurn = await CoachConversation.findById(conversationId);
      const userMessagesAfterSecond = convAfterSecondTurn?.messages.filter((m) => m.role === "user");

      // Verify legitimate repeated prompt with new clientMessageId is preserved! Exactly 2 user messages exist!
      expect(userMessagesAfterSecond?.length).toBe(2);
    });
  });

  // =========================================================================
  // Area D: Rate Limiting & BullMQ Outbox Worker Reconciliation
  // =========================================================================
  describe("Area D: Rate Limiting & BullMQ Outbox Worker Reconciliation Baseline", () => {
    it("rate limiter enforces limits and throws 429 when quota exceeded", async () => {
      const keyId = `rl_test_${Date.now()}`;
      createdRedisKeys.push(`rate-limit:test-rl:${keyId}`);

      const mockReq = new Request("http://localhost:3000/api/auth/login");

      // 2 allowed requests
      const res1 = await checkRateLimit(mockReq, {
        keyPrefix: "test-rl",
        identifier: keyId,
        limit: 2,
        windowSeconds: 60,
      });
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(1);

      const res2 = await checkRateLimit(mockReq, {
        keyPrefix: "test-rl",
        identifier: keyId,
        limit: 2,
        windowSeconds: 60,
      });
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(0);

      // 3rd request must throw 429
      await expect(
        checkRateLimit(mockReq, {
          keyPrefix: "test-rl",
          identifier: keyId,
          limit: 2,
          windowSeconds: 60,
        })
      ).rejects.toThrow("Too many requests");
    });

    it("rate limiter fails open gracefully when Redis connection fails", async () => {
      const mockReq = new Request("http://localhost:3000/api/auth/login");
      const redis = getRedisClient();
      vi.spyOn(redis, "eval").mockRejectedValueOnce(new Error("Redis connection refused"));

      const res = await checkRateLimit(mockReq, {
        keyPrefix: "test-rl-failopen",
        limit: 5,
        windowSeconds: 60,
      });

      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(1);
    });

    // --- SCOPE E: DEF-2B-WORKER-01 Fixed Verification Tests ---
    it("DEF-2B-WORKER-01: transitions exhausted stalled processing outbox records to failed while resetting non-exhausted records to pending", async () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // 1. Stalled exhausted record (attempts >= maxAttempts)
      const exhaustedDoc = await EmailOutbox.create({
        recipientEmail: `exhausted-${Date.now()}@example.com`,
        subject: "Exhausted Delivery",
        template: "verification",
        encryptedPayload: "mock_encrypted_payload",
        status: "processing",
        attempts: 3,
        maxAttempts: 3,
      });
      createdOutboxIds.push(exhaustedDoc._id);
      await EmailOutbox.collection.updateOne(
        { _id: exhaustedDoc._id },
        { $set: { updatedAt: tenMinutesAgo } }
      );

      // 2. Stalled record with attempts remaining (attempts < maxAttempts)
      const retryableDoc = await EmailOutbox.create({
        recipientEmail: `retryable-${Date.now()}@example.com`,
        subject: "Retryable Delivery",
        template: "verification",
        encryptedPayload: "mock_encrypted_payload",
        status: "processing",
        attempts: 1,
        maxAttempts: 3,
      });
      createdOutboxIds.push(retryableDoc._id);
      await EmailOutbox.collection.updateOne(
        { _id: retryableDoc._id },
        { $set: { updatedAt: tenMinutesAgo } }
      );

      // 3. Recently active processing record (updatedAt within 5 minutes)
      const activeDoc = await EmailOutbox.create({
        recipientEmail: `active-${Date.now()}@example.com`,
        subject: "Active Delivery",
        template: "verification",
        encryptedPayload: "mock_encrypted_payload",
        status: "processing",
        attempts: 3,
        maxAttempts: 3,
        updatedAt: new Date(), // Just started
      });
      createdOutboxIds.push(activeDoc._id);

      // 4. Already sent record
      const sentDoc = await EmailOutbox.create({
        recipientEmail: `sent-${Date.now()}@example.com`,
        subject: "Sent Delivery",
        template: "verification",
        encryptedPayload: "mock_encrypted_payload",
        status: "sent",
        attempts: 1,
        maxAttempts: 3,
        updatedAt: tenMinutesAgo,
      });
      createdOutboxIds.push(sentDoc._id);

      // Run recovery sweep (mock delivery so retryable record isn't sent immediately)
      await processEmailOutbox(0);

      const afterExhausted = await EmailOutbox.findById(exhaustedDoc._id);
      const afterRetryable = await EmailOutbox.findById(retryableDoc._id);
      const afterActive = await EmailOutbox.findById(activeDoc._id);
      const afterSent = await EmailOutbox.findById(sentDoc._id);

      // Assertions
      expect(afterExhausted?.status).toBe("failed");
      expect(afterExhausted?.lastError).toContain("exhausted");

      expect(afterRetryable?.status).toBe("pending");

      expect(afterActive?.status).toBe("processing");

      expect(afterSent?.status).toBe("sent");
    });
  });
});
