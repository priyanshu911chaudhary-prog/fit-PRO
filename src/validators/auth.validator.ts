import { z } from "zod";

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password cannot exceed 72 characters (bcrypt limit)")
  .regex(
    passwordRegex,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
  );

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .trim()
    .toLowerCase(),
  password: passwordRule,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: passwordRule,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordRule,
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
