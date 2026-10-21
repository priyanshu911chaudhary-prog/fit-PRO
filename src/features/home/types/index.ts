export interface AiPromptItem {
  title: string;
  q: string;
  recommendation: string;
  macros?: {
    kcal: number;
    protein: string;
    carbs: string;
    fat: string;
  };
  steps: string[];
  tip: string;
}
