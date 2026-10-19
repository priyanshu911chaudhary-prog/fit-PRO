import { z } from "zod";

export const logBmiSchema = z.object({
  weight: z
    .number()
    .min(20, "Weight must be at least 20kg")
    .max(300, "Weight must be at most 300kg"),
  height: z
    .number()
    .min(50, "Height must be at least 50cm")
    .max(250, "Height must be at most 250cm"),
  date: z.coerce.date().optional(),
});

export type LogBmiInput = z.infer<typeof logBmiSchema>;
