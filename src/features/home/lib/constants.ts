import { AiPromptItem } from "../types";

export const AI_PROMPTS: AiPromptItem[] = [
  {
    title: "Bench Press Plateau Protocol",
    q: "How do I break through a bench press plateau?",
    recommendation: "Introduce paused reps and adjust your accessory pressing volume.",
    steps: [
      "Incorporate 2-second paused reps at the chest on your first two working sets to eliminate elastic rebound.",
      "Add Close-Grip Barbell Bench Press (3 sets × 6–8 reps) to overload the tricep lock-out phase.",
      "Program face pulls and chest-supported rows to maintain scapular retraction and shoulder stability under load.",
    ],
    tip: "Ensure you are consuming at least 0.8g–1g protein per lb of bodyweight to optimize myofibrillar protein synthesis.",
  },
  {
    title: "Post-Workout Macro Target",
    q: "Suggest a 650 kcal post-workout meal with 50g+ protein",
    recommendation:
      "High-protein grilled salmon bowl with complex carbohydrates and electrolyte-rich greens.",
    macros: { kcal: 640, protein: "52g", carbs: "58g", fat: "18g" },
    steps: [
      "200g wild-caught salmon fillet (pan-seared in 1 tsp avocado oil).",
      "150g cooked tri-color quinoa for sustained glycogen replenishment.",
      "Steamed asparagus spears seasoned with sea salt and lemon juice.",
      "Side: 100g 0% Greek yogurt with fresh blueberries.",
    ],
    tip: "Consume within 90 minutes post-training to maximize muscle glycogen resynthesis and recovery.",
  },
  {
    title: "Squat Biomechanics & Knee Health",
    q: "What is the best warmup sequence for heavy barbell squats?",
    recommendation:
      "Target hip capsule mobility, ankle dorsiflexion, and gluteus medius activation.",
    steps: [
      "90/90 Hip Mobility Flow — 10 slow transitions per side.",
      "Banded Lateral Monster Walks — 2 sets × 15 reps to fire the abductors.",
      "Goblet Squat Pry — Hold at bottom depth for 5 seconds to open adductors.",
      "Barbell Ramp-Up — 40%, 60%, 80% working weight for 3–5 crisp explosive reps.",
    ],
    tip: "Actively 'screw your feet into the floor' to create external torque at the hips before descending.",
  },
];
