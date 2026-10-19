import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { env } from "../env";
import { logger } from "../logger";

export const aiWorkoutPlanSchema = z.object({
  planName: z.string().min(1),
  schedule: z
    .array(
      z.object({
        day: z.string().min(1),
        exercises: z
          .array(
            z.object({
              name: z.string().min(1),
              sets: z.coerce.number().min(1).max(20),
              reps: z.coerce.number().min(1).max(100),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

export const aiMealPlanSchema = z.object({
  planName: z.string().min(1),
  schedule: z
    .array(
      z.object({
        day: z.string().min(1),
        meals: z
          .array(
            z.object({
              name: z.string().min(1),
              servingSize: z.string().default("1 serving"),
              calories: z.coerce.number().min(0).max(3000),
              protein: z.coerce.number().min(0).max(200),
              carbs: z.coerce.number().min(0).max(300),
              fat: z.coerce.number().min(0).max(150),
            })
          )
          .min(1),
      })
    )
    .min(1),
});

export type AIWorkoutPlanOutput = z.infer<typeof aiWorkoutPlanSchema>;
export type AIMealPlanOutput = z.infer<typeof aiMealPlanSchema>;

export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AICoachContext {
  profile?: {
    fitnessGoal?: string;
    dietaryPreference?: string;
    activityLevel?: string;
    experienceLevel?: string;
    equipmentAvailable?: string[];
  };
  bmi?: {
    bmi?: number;
    category?: string;
  };
  recentWorkouts?: Array<{ title: string; totalDuration: number }>;
  recentMeals?: Array<{ title: string; totalCalories: number }>;
}

function getGenAIClient(): GoogleGenAI {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on this server");
  }
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

export const HEALTH_DISCLAIMER =
  "⚠️ Medical Disclaimer: I am an AI fitness assistant, not a doctor, licensed dietitian, or certified medical professional. The recommendations provided are for general wellness purposes only. Please consult a qualified physician before starting any new diet or intense exercise regimen.";

/**
 * Generate a personalized 3-day workout plan using Gemini with structured JSON validation
 */
export async function generateWorkoutPlanAI(profile: {
  fitnessGoal: string;
  equipmentAvailable?: string[];
  experienceLevel?: string;
}): Promise<AIWorkoutPlanOutput> {
  const ai = getGenAIClient();
  const primaryModel = env.GEMINI_MODEL || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  const prompt = `
You are a professional fitness coach. Create a 3-day workout plan for a user with the following profile:
- Fitness Goal: ${profile.fitnessGoal}
- Equipment Available: ${(profile.equipmentAvailable || ["bodyweight"]).join(", ")}
- Experience Level: ${profile.experienceLevel || "beginner"}

Output ONLY valid JSON matching this schema with NO markdown code fences and no conversational filler:
{
  "planName": "string",
  "schedule": [
    {
      "day": "Day 1",
      "exercises": [
        { "name": "Exact exercise name", "sets": 3, "reps": 12 }
      ]
    }
  ]
}
Ensure exercise names use standard gym or bodyweight fitness terminology (e.g., Push-ups, Squats, Plank).
`;

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    const currentModel = attempts === 1 ? primaryModel : fallbackModel;
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      let text = response.text || "";
      text = text.replace(/```json/gi, "").replace(/```/gi, "").trim();

      const parsed = JSON.parse(text);
      return aiWorkoutPlanSchema.parse(parsed);
    } catch (err: unknown) {
      logger.warn(`AI Workout plan generation attempt ${attempts} with ${currentModel} failed:`, {
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempts >= 3) {
        throw new Error("Failed to generate a valid workout plan from AI service");
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Failed to generate workout plan");
}

/**
 * Generate a personalized 3-day meal plan using Gemini with structured JSON validation
 */
export async function generateMealPlanAI(profile: {
  fitnessGoal: string;
  dietaryPreference?: string;
}): Promise<AIMealPlanOutput> {
  const ai = getGenAIClient();
  const primaryModel = env.GEMINI_MODEL || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  const prompt = `
You are a professional nutritionist. Create a 3-day meal plan for a user with the following profile:
- Fitness Goal: ${profile.fitnessGoal}
- Dietary Preference: ${profile.dietaryPreference || "none"}

Output ONLY valid JSON matching this schema with NO markdown code fences:
{
  "planName": "string",
  "schedule": [
    {
      "day": "Day 1",
      "meals": [
        {
          "name": "Food item name",
          "servingSize": "1 bowl",
          "calories": 400,
          "protein": 25,
          "carbs": 45,
          "fat": 12
        }
      ]
    }
  ]
}
Ensure macro values are realistic for the specified serving size.
`;

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    const currentModel = attempts === 1 ? primaryModel : fallbackModel;
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      let text = response.text || "";
      text = text.replace(/```json/gi, "").replace(/```/gi, "").trim();

      const parsed = JSON.parse(text);
      return aiMealPlanSchema.parse(parsed);
    } catch (err: unknown) {
      logger.warn(`AI Meal plan generation attempt ${attempts} with ${currentModel} failed:`, {
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempts >= 3) {
        throw new Error("Failed to generate a valid meal plan from AI service");
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Failed to generate meal plan");
}

function buildSystemPrompt(context: AICoachContext): string {
  const recentWorkoutsStr =
    context.recentWorkouts && context.recentWorkouts.length > 0
      ? context.recentWorkouts.map((w) => `- ${w.title} (${w.totalDuration} mins)`).join("\n")
      : "No workouts logged yet.";

  const recentMealsStr =
    context.recentMeals && context.recentMeals.length > 0
      ? context.recentMeals.map((m) => `- ${m.title} (${m.totalCalories} kcal)`).join("\n")
      : "No meals logged yet.";

  return `
You are a supportive, knowledgeable, and motivating AI Fitness and Nutrition Coach.
User Context:
- Fitness Goal: ${context.profile?.fitnessGoal || "General Fitness"}
- Dietary Preference: ${context.profile?.dietaryPreference || "None"}
- Activity Level: ${context.profile?.activityLevel || "Sedentary"}
- Experience Level: ${context.profile?.experienceLevel || "Beginner"}
- Equipment Available: ${(context.profile?.equipmentAvailable || ["bodyweight"]).join(", ")}
- Current BMI: ${context.bmi?.bmi || "Not recorded"} (${context.bmi?.category || "Normal"})

Recent Activity:
Workouts:
${recentWorkoutsStr}

Meals:
${recentMealsStr}

Guidelines:
1. Provide practical, concise, encouraging fitness and nutrition guidance tailored to their profile and recent activity.
2. Keep responses focused, friendly, and actionable (maximum 200 words).
3. Do not prescribe prescription medication or diagnose illnesses.
`;
}

/**
 * Generate single non-streaming response for /api/ai/chat
 */
export async function generateCoachChatJSON(
  message: string,
  context: AICoachContext,
  history: AIChatMessage[] = []
): Promise<string> {
  const ai = getGenAIClient();
  const primaryModel = env.GEMINI_MODEL || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  const systemPrompt = buildSystemPrompt(context);
  const cappedHistory = history.slice(-10); // cap to last 10 messages

  const conversationHistory = cappedHistory
    .map((msg) => `${msg.role === "user" ? "User" : "Coach"}: ${msg.content}`)
    .join("\n");

  const fullPrompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nUser says: "${message}"\nCoach:`;

  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: fullPrompt,
    });
    return (response.text || "").trim();
  } catch (err: unknown) {
    logger.warn(`AI Coach chat with ${primaryModel} failed, trying ${fallbackModel}:`, {
      error: err instanceof Error ? err.message : String(err),
    });
    const fallbackResponse = await ai.models.generateContent({
      model: fallbackModel,
      contents: fullPrompt,
    });
    return (fallbackResponse.text || "").trim();
  }
}

/**
 * Stream coach chat response token by token for /api/coach
 */
export async function* streamCoachChat(
  message: string,
  context: AICoachContext,
  history: AIChatMessage[] = []
): AsyncGenerator<string> {
  const ai = getGenAIClient();
  const primaryModel = env.GEMINI_MODEL || "gemini-3.5-flash";
  const fallbackModel = "gemini-3.1-flash-lite";

  const systemPrompt = buildSystemPrompt(context);
  const cappedHistory = history.slice(-10);

  const conversationHistory = cappedHistory
    .map((msg) => `${msg.role === "user" ? "User" : "Coach"}: ${msg.content}`)
    .join("\n");

  const fullPrompt = `${systemPrompt}\n\nConversation History:\n${conversationHistory}\n\nUser says: "${message}"\nCoach:`;

  let responseStream;
  try {
    responseStream = await ai.models.generateContentStream({
      model: primaryModel,
      contents: fullPrompt,
    });
  } catch (err: unknown) {
    logger.warn(`AI Coach stream with ${primaryModel} failed, falling back to ${fallbackModel}:`, {
      error: err instanceof Error ? err.message : String(err),
    });
    responseStream = await ai.models.generateContentStream({
      model: fallbackModel,
      contents: fullPrompt,
    });
  }

  for await (const chunk of responseStream) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}
