import { test, expect } from "@playwright/test";
import { E2ETestContext } from "../fixtures/test-context";
import { MealLog } from "@/models/mealLog";
import { WorkoutLog } from "@/models/workoutLog";
import { WaterLog } from "@/models/waterLog";
import { CoachConversation } from "@/models/coachConversation";
import { Notification } from "@/models/notification";
import { Exercise } from "@/models/exercise";
import { FoodItem } from "@/models/foodItem";

test.describe("Journey 09: Cross-User Authorization and Data Integrity", () => {
  let ctx: E2ETestContext;

  test.beforeAll(async () => {
    ctx = new E2ETestContext();
    await ctx.connect();
  });

  test.afterAll(async () => {
    await ctx.cleanup();
  });

  test("proves User B cannot read, alter, or delete User A's private resources via ID substitution", async ({ baseURL }) => {
    const userA = await ctx.createTestUser({ fullName: "Victim User A", hasProfile: true });
    const userB = await ctx.createTestUser({ fullName: "Attacker User B", hasProfile: true });

    const sampleFood = await FoodItem.findOne({});
    const sampleExercise = await Exercise.findOne({});

    // 1. Seed User A's private resources
    const userAMeal = await MealLog.create({
      user: userA.user._id,
      title: "User A Private Lunch",
      mealType: "lunch",
      consumedDate: "2026-10-29",
      totalCalories: 500,
      totalProtein: 40,
      totalCarbs: 50,
      totalFat: 15,
      meals: [
        {
          foodItemId: sampleFood!._id,
          name: sampleFood!.name,
          quantity: 100,
          unit: "g",
          calories: 500,
          protein: 40,
          carbs: 50,
          fat: 15,
        },
      ],
    });
    ctx.createdMealLogIds.push(userAMeal._id);

    const userAWorkout = await WorkoutLog.create({
      user: userA.user._id,
      title: "User A Heavy Workout",
      totalDuration: 50,
      date: "2026-10-29",
      exercises: [
        {
          exerciseId: sampleExercise!._id,
          sets: 3,
          reps: 10,
          weight: 80,
        },
      ],
      completionPercentage: 100,
    });
    ctx.createdWorkoutLogIds.push(userAWorkout._id);

    const userAWater = await WaterLog.create({
      user: userA.user._id,
      amountMl: 500,
      date: new Date(),
    });
    ctx.createdWaterLogIds.push(userAWater._id);

    const userAConv = await CoachConversation.create({
      user: userA.user._id,
      title: "User A Confidential Chat",
      messages: [
        {
          role: "user",
          content: "What supplements should I take for muscle recovery?",
          createdAt: new Date(),
        },
      ],
    });
    ctx.createdCoachConvIds.push(userAConv._id);

    const userANotif = await Notification.create({
      user: userA.user._id,
      type: "workout_nudge",
      title: "User A Confidential Notification",
      body: "Private body metrics updated",
      category: "workout",
      destinationUrl: "/workout",
    });
    ctx.createdNotificationIds.push(userANotif._id);

    const userBHeaders = {
      Authorization: `Bearer ${userB.accessToken}`,
      Cookie: `accessToken=${userB.accessToken}; refreshToken=${userB.refreshToken}`,
      "Content-Type": "application/json",
    };

    // 2. User B attempts to read User A's Coach Conversation
    const readConvRes = await fetch(
      `${baseURL || "http://localhost:3000"}/api/coach/conversations/${userAConv._id}`,
      { headers: userBHeaders }
    );
    expect([403, 404]).toContain(readConvRes.status);

    // 3. User B attempts to update User A's Coach Conversation title
    const updateConvRes = await fetch(
      `${baseURL || "http://localhost:3000"}/api/coach/conversations/${userAConv._id}`,
      {
        method: "PATCH",
        headers: userBHeaders,
        body: JSON.stringify({ title: "Hacked by User B" }),
      }
    );
    expect([403, 404]).toContain(updateConvRes.status);

    // 4. User B attempts to delete User A's Coach Conversation
    const deleteConvRes = await fetch(
      `${baseURL || "http://localhost:3000"}/api/coach/conversations/${userAConv._id}`,
      { method: "DELETE", headers: userBHeaders }
    );
    expect([403, 404]).toContain(deleteConvRes.status);

    // 5. User B attempts to delete User A's Meal Log
    const deleteMealRes = await fetch(
      `${baseURL || "http://localhost:3000"}/api/meal/${userAMeal._id}`,
      { method: "DELETE", headers: userBHeaders }
    );
    expect([403, 404]).toContain(deleteMealRes.status);

    // 6. User B attempts to delete User A's Workout Log
    const deleteWorkoutRes = await fetch(
      `${baseURL || "http://localhost:3000"}/api/workout/${userAWorkout._id}`,
      { method: "DELETE", headers: userBHeaders }
    );
    expect([403, 404]).toContain(deleteWorkoutRes.status);

    // 7. User B attempts to delete User A's Water Log
    const deleteWaterRes = await fetch(
      `${baseURL || "http://localhost:3000"}/api/water/${userAWater._id}`,
      { method: "DELETE", headers: userBHeaders }
    );
    expect([403, 404]).toContain(deleteWaterRes.status);

    // 8. User B attempts to mark User A's Notification read
    const updateNotifRes = await fetch(
      `${baseURL || "http://localhost:3000"}/api/notifications/${userANotif._id}`,
      {
        method: "PATCH",
        headers: userBHeaders,
        body: JSON.stringify({ clicked: true }),
      }
    );
    expect([403, 404]).toContain(updateNotifRes.status);

    // 9. VERIFY DATA INTEGRITY: User A's resources MUST remain completely untouched
    const intactConv = await CoachConversation.findById(userAConv._id);
    expect(intactConv).not.toBeNull();
    expect(intactConv?.title).toBe("User A Confidential Chat");

    const intactMeal = await MealLog.findById(userAMeal._id);
    expect(intactMeal).not.toBeNull();

    const intactWorkout = await WorkoutLog.findById(userAWorkout._id);
    expect(intactWorkout).not.toBeNull();

    const intactWater = await WaterLog.findById(userAWater._id);
    expect(intactWater).not.toBeNull();

    const intactNotif = await Notification.findById(userANotif._id);
    expect(intactNotif).not.toBeNull();
    expect(intactNotif?.readAt).toBeFalsy();
  });

  test("enforces robust validation against malformed payloads, invalid IDs, and unauthorized requests", async ({ baseURL }) => {
    const { accessToken, refreshToken } = await ctx.createTestUser({ hasProfile: true });

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Cookie: `accessToken=${accessToken}; refreshToken=${refreshToken}`,
      "Content-Type": "application/json",
    };

    // 1. Malformed JSON body
    const malformedRes = await fetch(`${baseURL || "http://localhost:3000"}/api/water`, {
      method: "POST",
      headers: authHeaders,
      body: "invalid_not_json_string{{{",
    });
    expect([400, 422]).toContain(malformedRes.status);

    // 2. Missing required fields in meal log
    const missingFieldRes = await fetch(`${baseURL || "http://localhost:3000"}/api/meal`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ title: "Incomplete Meal" }), // missing mealType, consumedDate, meals
    });
    expect(missingFieldRes.status).toBe(400);

    // 3. Non-hex malformed ID in route parameter
    const invalidIdRes = await fetch(`${baseURL || "http://localhost:3000"}/api/water/not-a-valid-mongo-id`, {
      method: "DELETE",
      headers: authHeaders,
    });
    expect([400, 404, 500]).toContain(invalidIdRes.status);

    // 4. Completely unauthenticated request to protected mutation
    const anonRes = await fetch(`${baseURL || "http://localhost:3000"}/api/workout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unauthorized Workout" }),
    });
    expect([401, 307]).toContain(anonRes.status);
  });
});
