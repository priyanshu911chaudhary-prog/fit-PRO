import {
  Dumbbell,
  Flame,
  Zap,
  Activity,
  HeartPulse,
  LucideIcon,
} from "lucide-react";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserGenderEnum,
  ExperienceLevelEnum,
} from "@/constants";
import { StepConfig } from "../types";

export interface GoalOption {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: UserGoalEnum.MUSCLE_BUILDING,
    title: "Muscle Building",
    desc: "Hypertrophy protocols with progressive overload volume.",
    icon: Dumbbell,
  },
  {
    id: UserGoalEnum.WEIGHT_LOSS,
    title: "Weight & Fat Loss",
    desc: "Caloric deficit designed to preserve lean muscle tissue.",
    icon: Flame,
  },
  {
    id: UserGoalEnum.STRENGTH_TRAINING,
    title: "Strength & Power",
    desc: "Neuromuscular force production with heavy compound lifts.",
    icon: Zap,
  },
  {
    id: UserGoalEnum.ENDURANCE_TRAINING,
    title: "Athletic Endurance",
    desc: "Cardiorespiratory stamina, lactate threshold, and VO2 max.",
    icon: Activity,
  },
  {
    id: UserGoalEnum.GENERAL_FITNESS,
    title: "Longevity & Health",
    desc: "Balanced metabolic conditioning, mobility, and vitality.",
    icon: HeartPulse,
  },
];

export const ACTIVITY_OPTIONS = [
  {
    id: UserActivityLevelEnum.SEDENTARY,
    label: "Sedentary",
    detail: "Desk job, little to no exercise",
  },
  {
    id: UserActivityLevelEnum.LIGHTLY_ACTIVE,
    label: "Lightly Active",
    detail: "Light training 1–3 days/wk",
  },
  {
    id: UserActivityLevelEnum.MODERATELY_ACTIVE,
    label: "Moderately Active",
    detail: "Moderate exercise 3–5 days/wk",
  },
  {
    id: UserActivityLevelEnum.VERY_ACTIVE,
    label: "Very Active",
    detail: "Intense training 6–7 days/wk",
  },
  {
    id: UserActivityLevelEnum.SUPER_ACTIVE,
    label: "Super Active",
    detail: "Daily athletic training or physical job",
  },
];

export const STEPS: StepConfig[] = [
  { number: 1, title: "Biometrics", short: "Body Specs" },
  { number: 2, title: "Goals", short: "Training & Activity" },
  { number: 3, title: "Equipment", short: "Gear & Diet" },
  { number: 4, title: "Calibration", short: "Review Baseline" },
];

export const GENDER_OPTIONS = [
  { id: UserGenderEnum.MALE, label: "Male" },
  { id: UserGenderEnum.FEMALE, label: "Female" },
  { id: UserGenderEnum.OTHER, label: "Other" },
];

export const EXPERIENCE_OPTIONS = [
  { id: ExperienceLevelEnum.BEGINNER, label: "Beginner", sub: "< 1 year" },
  { id: ExperienceLevelEnum.INTERMEDIATE, label: "Intermediate", sub: "1–3 years" },
  { id: ExperienceLevelEnum.ADVANCED, label: "Advanced", sub: "3+ years" },
];
