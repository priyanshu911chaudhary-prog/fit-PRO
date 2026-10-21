import { Activity, Dumbbell, Utensils, Zap } from "lucide-react";
import type { ChatMessage, PromptSuggestion } from "../types";

export const LOCAL_STORAGE_ACTIVE_CHAT_KEY = "fitpro_active_coach_chat_id";

export const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "System calibrated. I am your fit-PRO Biomechanics & Athletic Intelligence Engine. Whether you need progressive overload programming, kinematic form cues, macronutrient partition strategies, or cellular recovery protocols, I am ready to advise. What is your training priority today?",
  timestamp: "12:00 PM",
};

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    label: "Strength Overload",
    query: "How can I increase pull-up strength safely without shoulder impingement?",
    icon: Dumbbell,
  },
  {
    label: "Hypertrophy Fuel",
    query: "Suggest a high-protein post-workout vegetarian meal under 650 kcal",
    icon: Utensils,
  },
  {
    label: "Recovery Protocol",
    query: "How should I structure my rest days between heavy hypertrophy sessions?",
    icon: Activity,
  },
  {
    label: "Hydration Balance",
    query: "Tips for optimizing cellular hydration and electrolytes during intense cardio",
    icon: Zap,
  },
];
