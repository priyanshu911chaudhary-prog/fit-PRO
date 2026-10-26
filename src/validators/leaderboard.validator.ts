import { z } from "zod";

export const leaderboardQuerySchema = z.object({
  period: z.enum(["current", "previous"]).default("current"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const updateLeaderboardPreferencesSchema = z.object({
  optIn: z.boolean().optional(),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(30, "Display name cannot exceed 30 characters")
    .regex(/^[a-zA-Z0-9_\- ]+$/, "Display name can only contain letters, numbers, spaces, underscores, and hyphens")
    .optional(),
  weeklyWorkoutGoal: z
    .number()
    .min(1, "Weekly workout goal must be at least 1 session")
    .max(14, "Weekly workout goal cannot exceed 14 sessions")
    .optional(),
  dailyProteinTarget: z
    .number()
    .min(30, "Daily protein target must be at least 30g")
    .max(350, "Daily protein target cannot exceed 350g")
    .optional(),
  dailyHydrationTarget: z
    .number()
    .min(1000, "Daily hydration target must be at least 1,000 ml")
    .max(6000, "Daily hydration target cannot exceed 6,000 ml")
    .optional(),
});

export type LeaderboardQueryInput = z.infer<typeof leaderboardQuerySchema>;
export type UpdateLeaderboardPreferencesInput = z.infer<typeof updateLeaderboardPreferencesSchema>;
