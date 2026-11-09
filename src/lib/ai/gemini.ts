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

/**
 * Wraps a promise with a bounded execution timeout to prevent hanging worker threads.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export const HEALTH_DISCLAIMER =
  "⚠️ Medical Disclaimer: I am an AI fitness assistant, not a doctor, licensed dietitian, or certified medical professional. The recommendations provided are for general wellness purposes only. Please consult a qualified physician before starting any new diet or intense exercise regimen.";

/**
 * Provider interface for plan generation
 */
export interface AIPlanProvider {
  generateWorkoutPlan(profile: {
    fitnessGoal: string;
    equipmentAvailable?: string[];
    experienceLevel?: string;
  }): Promise<string>;

  generateMealPlan(profile: {
    fitnessGoal: string;
    dietaryPreference?: string;
  }): Promise<string>;
}

/**
 * Live Google GenAI plan generation provider
 */
class GoogleGenAIPlanProvider implements AIPlanProvider {
  async generateWorkoutPlan(profile: {
    fitnessGoal: string;
    equipmentAvailable?: string[];
    experienceLevel?: string;
  }): Promise<string> {
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
        const response = await withTimeout(
          ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          }),
          25000,
          `AI Workout plan generation timed out after 25s with ${currentModel}`
        );

        return response.text || "";
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

  async generateMealPlan(profile: {
    fitnessGoal: string;
    dietaryPreference?: string;
  }): Promise<string> {
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
        const response = await withTimeout(
          ai.models.generateContent({
            model: currentModel,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          }),
          25000,
          `AI Workout plan generation timed out after 25s with ${currentModel}`
        );

        return response.text || "";
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
}

/**
 * Deterministic test mock provider for offline & CI/CD plan generation
 */
class DeterministicMockPlanProvider implements AIPlanProvider {
  async generateWorkoutPlan(profile: {
    fitnessGoal: string;
    equipmentAvailable?: string[];
    experienceLevel?: string;
  }): Promise<string> {
    return JSON.stringify({
      planName: `Deterministic 3-Day ${profile.fitnessGoal || "General"} Blueprint`,
      schedule: [
        {
          day: "Day 1",
          exercises: [
            { name: "Push-ups", sets: 3, reps: 12 },
            { name: "Bodyweight Squat", sets: 3, reps: 15 },
          ],
        },
        {
          day: "Day 2",
          exercises: [{ name: "Plank", sets: 3, reps: 30 }],
        },
        {
          day: "Day 3",
          exercises: [{ name: "Pull-ups", sets: 3, reps: 8 }],
        },
      ],
    });
  }

  async generateMealPlan(profile: {
    fitnessGoal: string;
    dietaryPreference?: string;
  }): Promise<string> {
    return JSON.stringify({
      planName: `Deterministic 3-Day ${profile.dietaryPreference || "Balanced"} Fuel Protocol`,
      schedule: [
        {
          day: "Day 1",
          meals: [
            {
              name: "Oatmeal with Protein Powder",
              servingSize: "1 bowl",
              calories: 420,
              protein: 32,
              carbs: 54,
              fat: 8,
            },
            {
              name: "Grilled Chicken Breast with Brown Rice",
              servingSize: "1 plate",
              calories: 550,
              protein: 45,
              carbs: 50,
              fat: 10,
            },
          ],
        },
        {
          day: "Day 2",
          meals: [
            {
              name: "Greek Yogurt with Berries",
              servingSize: "1 cup",
              calories: 250,
              protein: 22,
              carbs: 30,
              fat: 4,
            },
          ],
        },
        {
          day: "Day 3",
          meals: [
            {
              name: "Salmon Fillet with Quinoa",
              servingSize: "1 plate",
              calories: 600,
              protein: 40,
              carbs: 45,
              fat: 18,
            },
          ],
        },
      ],
    });
  }
}

const defaultGoogleProvider = new GoogleGenAIPlanProvider();
const defaultMockProvider = new DeterministicMockPlanProvider();
let customPlanProvider: AIPlanProvider | null = null;

/**
 * Register a test-only AI Plan Provider.
 * Enforces strict fail-closed guard: prohibited in production environment.
 */
export function setAIPlanProvider(provider: AIPlanProvider | null): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Security violation: Mock AI plan provider cannot be registered in production environment");
  }
  customPlanProvider = provider;
}

/**
 * Resolves the active AI Plan Provider.
 * In production, strictly enforces GoogleGenAIPlanProvider.
 */
export function getAIPlanProvider(): AIPlanProvider {
  if (process.env.NODE_ENV === "production") {
    if (customPlanProvider) {
      throw new Error("Security violation: Custom AI plan provider is strictly prohibited in production");
    }
    return defaultGoogleProvider;
  }

  if (customPlanProvider) {
    return customPlanProvider;
  }

  if (process.env.AI_PROVIDER_MOCK === "true" || process.env.NODE_ENV === "test") {
    return defaultMockProvider;
  }

  return defaultGoogleProvider;
}

/**
 * Generate a personalized 3-day workout plan using Gemini with structured JSON validation
 */
export async function generateWorkoutPlanAI(profile: {
  fitnessGoal: string;
  equipmentAvailable?: string[];
  experienceLevel?: string;
}): Promise<AIWorkoutPlanOutput> {
  const provider = getAIPlanProvider();
  const rawText = await provider.generateWorkoutPlan(profile);
  const text = rawText.replace(/```json/gi, "").replace(/```/gi, "").trim();
  const parsed = JSON.parse(text);
  return aiWorkoutPlanSchema.parse(parsed);
}

/**
 * Generate a personalized 3-day meal plan using Gemini with structured JSON validation
 */
export async function generateMealPlanAI(profile: {
  fitnessGoal: string;
  dietaryPreference?: string;
}): Promise<AIMealPlanOutput> {
  const provider = getAIPlanProvider();
  const rawText = await provider.generateMealPlan(profile);
  const text = rawText.replace(/```json/gi, "").replace(/```/gi, "").trim();
  const parsed = JSON.parse(text);
  return aiMealPlanSchema.parse(parsed);
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
    const response = await withTimeout(
      ai.models.generateContent({
        model: primaryModel,
        contents: fullPrompt,
      }),
      25000,
      `AI Coach chat timed out after 25s with ${primaryModel}`
    );
    return (response.text || "").trim();
  } catch (err: unknown) {
    logger.warn(`AI Coach chat with ${primaryModel} failed, trying ${fallbackModel}:`, {
      error: err instanceof Error ? err.message : String(err),
    });
    const fallbackResponse = await withTimeout(
      ai.models.generateContent({
        model: fallbackModel,
        contents: fullPrompt,
      }),
      25000,
      `AI Coach fallback chat timed out after 25s with ${fallbackModel}`
    );
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
