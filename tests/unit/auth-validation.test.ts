import { describe, expect, it } from "vitest";
import { validateRegistrationInput } from "@/features/auth/lib/auth-validators";

describe("Auth Registration Validator", () => {
  it("rejects missing fields", () => {
    const res = validateRegistrationInput({
      name: "",
      email: "test@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      agreeTerms: true,
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Please fill in all required fields.");
  });

  it("rejects weak passwords", () => {
    const res = validateRegistrationInput({
      name: "John Doe",
      email: "test@example.com",
      password: "weak",
      confirmPassword: "weak",
      agreeTerms: true,
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Password must be at least 8 characters");
  });

  it("rejects mismatched passwords", () => {
    const res = validateRegistrationInput({
      name: "John Doe",
      email: "test@example.com",
      password: "Password123!",
      confirmPassword: "DifferentPassword123!",
      agreeTerms: true,
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Passwords do not match.");
  });

  it("rejects unaccepted terms", () => {
    const res = validateRegistrationInput({
      name: "John Doe",
      email: "test@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      agreeTerms: false,
    });
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Please agree to the Terms of Service.");
  });

  it("accepts valid input", () => {
    const res = validateRegistrationInput({
      name: "John Doe",
      email: "athlete@fitpro.dev",
      password: "SecurePassword123!",
      confirmPassword: "SecurePassword123!",
      agreeTerms: true,
    });
    expect(res.isValid).toBe(true);
    expect(res.error).toBeUndefined();
  });
});
