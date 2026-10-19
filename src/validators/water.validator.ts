import { z } from "zod";

export const logWaterSchema = z
  .object({
    amountMl: z
      .number()
      .min(1, "Amount must be at least 1 ml")
      .max(10000, "Amount cannot exceed 10,000 ml")
      .optional(),
    amount: z
      .number()
      .min(1, "Amount must be at least 1 ml")
      .max(10000, "Amount cannot exceed 10,000 ml")
      .optional(),
    date: z.coerce.date().optional(),
  })
  .refine((data) => data.amountMl !== undefined || data.amount !== undefined, {
    message: "Amount in ml is required",
    path: ["amountMl"],
  })
  .transform((data) => ({
    amountMl: (data.amountMl ?? data.amount) as number,
    date: data.date,
  }));

export type LogWaterInput = z.infer<typeof logWaterSchema>;
