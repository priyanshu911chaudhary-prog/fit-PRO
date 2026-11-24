import { sendCoachMessageSchema } from "@/validators/coach.validator";
import { validateBody } from "@/lib/api/with-validation";
import { NextRequest, NextResponse } from "next/server";
import {
  AIChatMessage,
  AICoachContext,
  generateCoachChatJSON,
  HEALTH_DISCLAIMER,
} from "@/lib/ai/gemini";
import { ApiResponse } from "@/lib/api/api-response";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { Bmi } from "@/models/bmi";
import { CoachConversation } from "@/models/coachConversation";

import { MealLog, type IMealLog } from "@/models/mealLog";
import { Profile } from "@/models/profile";
import { WorkoutLog, type IWorkoutLog } from "@/models/workoutLog";

export const maxDuration = 60; // Set route max duration for AI operations

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    // Rate limit AI chat: 15 requests per minute
    await checkRateLimit(req, {
      keyPrefix: "ai:chat",
      limit: 15,
      windowSeconds: 60,
      identifier: sessionUser.userId,
      message: "AI Coach rate limit reached. Please wait a moment before sending another message.",
    });

    const body = await validateBody(req, sendCoachMessageSchema);
    const { message, clientMessageId, history: clientHistory = [] } = body;
    let conversationId = body.conversationId;

    const userId = sessionUser.userId;

    // Load or create conversation
    let conversation = null;
    if (conversationId && /^[0-9a-fA-F]{24}$/.test(conversationId)) {
      conversation = await CoachConversation.findOne({
        _id: conversationId,
        user: userId,
      });
    }

    const titleSnippet = message.length > 40 ? `${message.slice(0, 37)}...` : message;

    if (!conversation) {
      conversation = await CoachConversation.create({
        user: userId,
        title: titleSnippet,
        messages: [],
      });
      conversationId = conversation._id.toString();
    } else if (conversation.title === "New Chat" || !conversation.title) {
      conversation.title = titleSnippet;
    }

    // Save user message to conversation idempotently using clientMessageId
    const alreadyExists = Boolean(
      clientMessageId &&
      conversation.messages.some(
        (m) => m.clientMessageId && m.clientMessageId === clientMessageId
      )
    );

    if (!alreadyExists) {
      conversation.messages.push({
        role: "user",
        content: message,
        createdAt: new Date(),
        clientMessageId: clientMessageId || undefined,
      });
      await conversation.save();
    }

    // Concurrently gather profile, BMI, and recent activity
    const [profile, bmi, recentWorkouts, recentMeals] = await Promise.all([
      Profile.findOne({ user: userId }),
      Bmi.findOne({ user: userId }).sort({ date: -1 }),
      WorkoutLog.find({ user: userId }).sort({ createdAt: -1 }).limit(3),
      MealLog.find({ user: userId }).sort({ createdAt: -1 }).limit(3),
    ]);

    const context: AICoachContext = {
      profile: profile
        ? {
            fitnessGoal: profile.fitnessGoal,
            dietaryPreference: profile.dietaryPreference,
            activityLevel: profile.activityLevel,
            experienceLevel: profile.experienceLevel,
            equipmentAvailable: profile.equipmentAvailable,
          }
        : undefined,
      bmi: bmi
        ? {
            bmi: bmi.bmi,
            category: bmi.category,
          }
        : undefined,
      recentWorkouts: recentWorkouts.map((w: IWorkoutLog) => ({
        title: w.title,
        totalDuration: w.totalDuration,
      })),
      recentMeals: recentMeals.map((m: IMealLog) => ({
        title: m.title,
        totalCalories: m.totalCalories,
      })),
    };

    const priorMessages = conversation.messages.slice(0, -1);
    const history: AIChatMessage[] =
      priorMessages.length > 0
        ? priorMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
        : clientHistory;

    const reply = await generateCoachChatJSON(message, context, history);

    // Save assistant reply
    conversation.messages.push({
      role: "assistant",
      content: reply,
      createdAt: new Date(),
    });
    await conversation.save();

    return NextResponse.json(
      new ApiResponse(200, "AI Coach responded", {
        reply,
        conversationId,
        title: conversation.title,
        disclaimer: HEALTH_DISCLAIMER,
      }),
      { status: 200 }
    );
  })
);
