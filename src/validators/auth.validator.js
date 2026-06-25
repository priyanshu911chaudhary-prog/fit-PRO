
import { z } from "zod";

export const registerSchema = z.object({
    fullName: z
        .string({ required_error: "Full name is required" })
        .min(2, "Full name must be at least 2 characters")
        .trim(),
    email: z
        .string({ required_error: "Email is required" })
        .email("Invalid email address")
        .trim()
        .toLowerCase(),
    password: z
        .string({ required_error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        // Optional: Add regex for stricter passwords (uppercase, number, symbol)
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address").trim().toLowerCase(),
    password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z
        .string({ required_error: "New password is required" })
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address").trim().toLowerCase(),
});

export const resetPasswordSchema = z.object({
    newPassword: z
        .string({ required_error: "New password is required" })
        .min(8, "Password must be at least 8 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
        ),
});