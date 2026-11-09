import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import { assertSafeTestDatabase } from "../helpers/db-guard";
import { decryptPayload } from "@/lib/email/crypto";
import { User, IUser } from "@/models/user";
import { Profile } from "@/models/profile";
import { EmailOutbox } from "@/models/emailOutbox";
import { MealLog } from "@/models/mealLog";
import { WorkoutLog } from "@/models/workoutLog";
import { WaterLog } from "@/models/waterLog";
import { CoachConversation } from "@/models/coachConversation";
import { Notification } from "@/models/notification";
import { Bmi } from "@/models/bmi";
import { MealPlan } from "@/models/mealPlan";
import { WorkoutPlan } from "@/models/workoutPlan";
import { LeaderboardSettings } from "@/models/leaderboardSettings";
import { WeeklyLeaderboardEntry } from "@/models/weeklyLeaderboardEntry";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export const SAFE_TEST_DB_URI = assertSafeTestDatabase(process.env.MONGODB_URI_TEST);

export class E2ETestContext {
  public runId: string;
  private isConnected = false;

  // Track created entity IDs for surgical, isolated cleanup
  public createdUserIds: mongoose.Types.ObjectId[] = [];
  public createdProfileIds: mongoose.Types.ObjectId[] = [];
  public createdMealLogIds: mongoose.Types.ObjectId[] = [];
  public createdWorkoutLogIds: mongoose.Types.ObjectId[] = [];
  public createdWaterLogIds: mongoose.Types.ObjectId[] = [];
  public createdCoachConvIds: mongoose.Types.ObjectId[] = [];
  public createdNotificationIds: mongoose.Types.ObjectId[] = [];
  public createdBmiIds: mongoose.Types.ObjectId[] = [];
  public createdPlanIds: mongoose.Types.ObjectId[] = [];

  constructor() {
    this.runId = `e2e-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  public async connect(): Promise<void> {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(SAFE_TEST_DB_URI, {
        bufferCommands: false,
      });
      this.isConnected = true;
    }
  }

  public createTestEmail(prefix = "user"): string {
    return `${prefix}-${this.runId}-${crypto.randomBytes(3).toString("hex")}@fitpro.test`;
  }

  public async createTestUser(options: {
    fullName?: string;
    email?: string;
    password?: string;
    role?: "user" | "admin";
    isVerified?: boolean;
    hasProfile?: boolean;
  } = {}): Promise<{
    user: IUser;
    password: string;
    accessToken: string;
    refreshToken: string;
  }> {
    await this.connect();

    const plainPassword = options.password || "SecureTestPass123!#";
    const email = options.email || this.createTestEmail(options.role === "admin" ? "admin" : "user");
    const fullName = options.fullName || (options.role === "admin" ? "Admin Auditor" : "Ordinary User");

    const user = new User({
      fullName,
      email,
      password: plainPassword,
      role: options.role || "user",
      isVerified: options.isVerified !== undefined ? options.isVerified : true,
      authProvider: "local",
    });

    await user.save();
    this.createdUserIds.push(user._id);

    if (options.hasProfile) {
      const profile = await Profile.create({
        user: user._id,
        gender: "male",
        dob: "1998-05-15",
        age: 28,
        height: 180,
        weight: 78,
        fitnessGoal: "muscle_building",
        activityLevel: "moderately_active",
        dietaryPreference: "none",
        experienceLevel: "intermediate",
        equipmentAvailable: ["dumbbell", "barbell", "bodyweight"],
        isProfileComplete: true,
      });
      this.createdProfileIds.push(profile._id);

      const bmi = await Bmi.create({
        user: user._id,
        weight: 78,
        height: 180,
        bmi: 24.1,
        category: "normal",
        date: new Date(),
      });
      this.createdBmiIds.push(bmi._id);
    }

    const accessToken = await signAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hasProfile: !!options.hasProfile,
      tokenVersion: user.tokenVersion ?? 0,
    });

    const refreshToken = await signRefreshToken({
      userId: user._id.toString(),
      email: user.email,
    });

    user.refreshToken = refreshToken;
    await user.save();

    return {
      user,
      password: plainPassword,
      accessToken,
      refreshToken,
    };
  }

  public async extractVerificationToken(email: string): Promise<{ token: string; link: string } | null> {
    await this.connect();
    const outbox = await EmailOutbox.findOne({ recipientEmail: email, template: "verification" }).sort({ createdAt: -1 });
    if (!outbox) return null;

    try {
      const payload = decryptPayload<{ name?: string; link: string }>(outbox.encryptedPayload);
      const url = new URL(payload.link);
      const token = url.pathname.split("/").pop() || "";
      return { token, link: payload.link };
    } catch {
      return null;
    }
  }

  public async cleanup(): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;

    try {
      if (this.createdUserIds.length > 0) {
        await Promise.all([
          User.deleteMany({ _id: { $in: this.createdUserIds } }),
          Profile.deleteMany({ user: { $in: this.createdUserIds } }),
          Bmi.deleteMany({ user: { $in: this.createdUserIds } }),
          MealLog.deleteMany({ user: { $in: this.createdUserIds } }),
          WorkoutLog.deleteMany({ user: { $in: this.createdUserIds } }),
          WaterLog.deleteMany({ user: { $in: this.createdUserIds } }),
          CoachConversation.deleteMany({ user: { $in: this.createdUserIds } }),
          Notification.deleteMany({ user: { $in: this.createdUserIds } }),
          MealPlan.deleteMany({ user: { $in: this.createdUserIds } }),
          WorkoutPlan.deleteMany({ user: { $in: this.createdUserIds } }),
          LeaderboardSettings.deleteMany({ user: { $in: this.createdUserIds } }),
          WeeklyLeaderboardEntry.deleteMany({ user: { $in: this.createdUserIds } }),
          EmailOutbox.deleteMany({ recipientEmail: { $regex: this.runId } }),
        ]);
      }
    } catch (err) {
      console.error("Cleanup error in E2ETestContext:", err);
    }
  }
}
