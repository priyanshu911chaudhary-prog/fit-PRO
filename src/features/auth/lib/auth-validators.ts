import type { RegistrationValidationResult } from "../types";

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function validateRegistrationInput(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}): RegistrationValidationResult {
  if (!input.name.trim() || !input.email.trim() || !input.password) {
    return {
      isValid: false,
      error: "Please fill in all required fields.",
    };
  }

  if (!PASSWORD_REGEX.test(input.password)) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.",
    };
  }

  if (input.password !== input.confirmPassword) {
    return {
      isValid: false,
      error: "Passwords do not match.",
    };
  }

  if (!input.agreeTerms) {
    return {
      isValid: false,
      error: "Please agree to the Terms of Service.",
    };
  }

  return { isValid: true };
}
