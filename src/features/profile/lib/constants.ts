import React from "react";
import { Dumbbell, Flame, Zap, Activity, HeartPulse } from "lucide-react";
import { UserGoalEnum } from "@/constants";

export const GOAL_ICONS: Record<string, React.ElementType> = {
  [UserGoalEnum.MUSCLE_BUILDING]: Dumbbell,
  [UserGoalEnum.WEIGHT_LOSS]: Flame,
  [UserGoalEnum.STRENGTH_TRAINING]: Zap,
  [UserGoalEnum.ENDURANCE_TRAINING]: Activity,
  [UserGoalEnum.GENERAL_FITNESS]: HeartPulse,
};
