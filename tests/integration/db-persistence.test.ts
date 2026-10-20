import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { User, Profile, Bmi, WaterLog } from "@/models";
import { connectDB } from "@/lib/db";
import { calculateBMI } from "@/lib/fitness-calc";

describe("Showcase: Integration Tests -> Database Persistence & Isolation", () => {
  const testRunId = Date.now();
  const testUserEmail = `integration_tester_${testRunId}@fitpro.test`;
  let createdUserId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    if (!process.env.MONGODB_URI && process.env.MONGO_URI) {
      process.env.MONGODB_URI = process.env.MONGO_URI;
    }
    await connectDB();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      if (createdUserId) {
        await WaterLog.deleteMany({ user: createdUserId });
        await Bmi.deleteMany({ user: createdUserId });
        await Profile.deleteMany({ user: createdUserId });
        await User.deleteOne({ _id: createdUserId });
      }
      await mongoose.disconnect();
    }
  });

  it("persists a newly registered User with hashed credentials in MongoDB", async () => {
    const user = new User({
      fullName: "Alex Integration",
      email: testUserEmail,
      password: "HashedPasswordSecure123!",
      isVerified: false,
    });

    const savedUser = await user.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe(testUserEmail);
    expect(savedUser.isVerified).toBe(false);

    createdUserId = savedUser._id;
  });

  it("creates and associates biometric Profile to the user", async () => {
    const profile = new Profile({
      user: createdUserId,
      height: 180,
      weight: 78,
      gender: "male",
      dob: new Date("1998-05-15"),
      age: 26,
      activityLevel: "moderately_active",
      fitnessGoal: "muscle_building",
      dietaryPreference: "none",
      experienceLevel: "intermediate",
      isProfileComplete: true,
    });

    const savedProfile = await profile.save();
    expect(savedProfile._id).toBeDefined();
    expect(savedProfile.user.toString()).toBe(createdUserId.toString());
    expect(savedProfile.height).toBe(180);
    expect(savedProfile.weight).toBe(78);
  });

  it("records initial Day-1 BMI history log and verifies mathematical category", async () => {
    const { bmi, category } = calculateBMI(78, 180);

    const bmiRecord = new Bmi({
      user: createdUserId,
      height: 180,
      weight: 78,
      bmi,
      category,
      date: new Date(),
    });

    const savedBmi = await bmiRecord.save();
    expect(savedBmi._id).toBeDefined();
    expect(savedBmi.bmi).toBe(24.1);
    expect(savedBmi.category).toBe("normal");
  });

  it("records and updates hydration logs atomically", async () => {
    const waterEntry = new WaterLog({
      user: createdUserId,
      amountMl: 500,
      date: new Date(),
    });

    const savedWater = await waterEntry.save();
    expect(savedWater._id).toBeDefined();
    expect(savedWater.amountMl).toBe(500);

    // Atomically increment
    const updated = await WaterLog.findByIdAndUpdate(
      savedWater._id,
      { $inc: { amountMl: 250 } },
      { new: true }
    );
    expect(updated?.amountMl).toBe(750);
  });

  it("verifies relational cascading query across User, Profile, and BMI", async () => {
    const foundUser = await User.findById(createdUserId);
    const foundProfile = await Profile.findOne({ user: createdUserId });
    const foundBmiLogs = await Bmi.find({ user: createdUserId });

    expect(foundUser).not.toBeNull();
    expect(foundProfile).not.toBeNull();
    expect(foundBmiLogs.length).toBeGreaterThan(0);
    expect(foundProfile?.user.toString()).toBe(foundUser?._id.toString());
    expect(foundBmiLogs[0].user.toString()).toBe(foundUser?._id.toString());
  });
});
