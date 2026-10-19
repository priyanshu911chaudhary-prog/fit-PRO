import { NextRequest } from "next/server";
import {
  AIChatMessage,
  AICoachContext,
  HEALTH_DISCLAIMER,
  streamCoachChat,
} from "@/lib/ai/gemini";
import { ApiError } from "@/lib/api/api-error";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { withAuth } from "@/lib/api/with-auth";
import { withHandler } from "@/lib/api/with-handler";
import { TokenPayload } from "@/lib/auth/jwt";
import { Bmi } from "@/models/bmi";
import { CoachConversation } from "@/models/coachConversation";
import { MealLog } from "@/models/mealLog";
import { Profile } from "@/models/profile";
import { WorkoutLog } from "@/models/workoutLog";

export const maxDuration = 60; // Timeout threshold for streaming

export const POST = withHandler(
  withAuth(async (req: NextRequest, _ctx: unknown, sessionUser: TokenPayload) => {
    // Rate limit AI streaming coach: 15 per minute
    await checkRateLimit(req, {
      keyPrefix: "ai:coach-stream",
      limit: 15,
      windowSeconds: 60,
      identifier: sessionUser.userId,
      message: "AI Coach rate limit reached. Please wait a moment before sending another message.",
    });

    const body = await req.json().catch(() => ({}));
    const message = (body.message as string)?.trim();
    const clientHistory = (body.history as AIChatMessage[]) || [];
    let conversationId = (body.conversationId as string)?.trim();

    if (!message) {
      throw new ApiError(400, "Message is required");
    }

    if (message.length > 2000) {
      throw new ApiError(400, "Message is too long (maximum 2000 characters)");
    }

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

    // Save user message to conversation
    conversation.messages.push({
      role: "user",
      content: message,
      createdAt: new Date(),
    });
    await conversation.save();

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
      recentWorkouts: recentWorkouts.map((w) => ({
        title: w.title,
        totalDuration: w.totalDuration,
      })),
      recentMeals: recentMeals.map((m) => ({
        title: m.title,
        totalCalories: m.totalCalories,
      })),
    };

    // Use conversation messages as source of truth for history (capped to last 10 prior messages)
    const priorMessages = conversation.messages.slice(0, -1);
    const history: AIChatMessage[] =
      priorMessages.length > 0
        ? priorMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
        : clientHistory;

    const encoder = new TextEncoder();
    const finalConvId = conversationId;
    const finalTitle = conversation.title;

    const stream = new ReadableStream({
      async start(controller) {
        let accumulatedText = "";
        try {
          const generator = streamCoachChat(message, context, history);
          for await (const chunk of generator) {
            accumulatedText += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          // Persist the assistant message to the database
          if (accumulatedText.trim()) {
            await CoachConversation.findByIdAndUpdate(finalConvId, {
              $push: {
                messages: {
                  role: "assistant",
                  content: accumulatedText.trim(),
                  createdAt: new Date(),
                },
              },
            });
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                conversationId: finalConvId,
                title: finalTitle,
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (err: unknown) {
          const errText =
            err instanceof Error ? err.message : "AI service temporarily unavailable";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errText })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Health-Disclaimer": encodeURIComponent(HEALTH_DISCLAIMER),
        "X-Conversation-Id": finalConvId,
      },
    });
  })
);
