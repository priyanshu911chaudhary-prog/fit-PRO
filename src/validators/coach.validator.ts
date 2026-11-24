import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const sendCoachMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(10).optional(),
  clientMessageId: z.string().trim().min(1).max(128).optional(),
  conversationId: z
    .string()
    .regex(objectIdRegex, "Invalid conversation ID format")
    .optional()
    .nullable(),
});

export const createConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .max(120, "Title cannot exceed 120 characters")
    .optional(),
  initialMessage: z
    .string()
    .trim()
    .max(2000)
    .optional(),
});

export const updateConversationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title cannot be empty")
    .max(120, "Title cannot exceed 120 characters"),
});

export type SendCoachMessageInput = z.infer<typeof sendCoachMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
