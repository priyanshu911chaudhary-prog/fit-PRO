export type AuthMode = "login" | "register";

export interface TabbedAuthCardProps {
  defaultMode?: AuthMode;
  redirectTarget?: string;
}

export interface RegistrationValidationResult {
  isValid: boolean;
  error?: string;
}
