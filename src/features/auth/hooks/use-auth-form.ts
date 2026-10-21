"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { AuthMode } from "../types";
import { validateRegistrationInput } from "../lib/auth-validators";

interface UseAuthFormOptions {
  defaultMode?: AuthMode;
  redirectTarget?: string;
}

export function useAuthForm({
  defaultMode = "login",
  redirectTarget,
}: UseAuthFormOptions = {}) {
  const { login, register, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultMode);

  // Common Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Register specific States
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", newMode === "login" ? "/login" : "/register");
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      toast.error("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email: email.trim(), password }, redirectTarget);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Invalid email or password.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateRegistrationInput({
      name,
      email,
      password,
      confirmPassword,
      agreeTerms,
    });

    if (!validation.isValid && validation.error) {
      setErrorMessage(validation.error);
      toast.error(validation.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setEmailDeliveryFailed(false);
      const res = await register({ name: name.trim(), email: email.trim(), password });
      if (res.success && res.emailSent === false) {
        setRegisteredEmail(email);
        setEmailDeliveryFailed(true);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Registration failed. Please check your details.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) return;
    try {
      setIsResending(true);
      const res = await apiClient("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: registeredEmail }),
      });
      if (res.success) {
        toast.success("Verification email resent! Please check your inbox.");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to resend verification email.";
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  return {
    mode,
    switchMode,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    name,
    setName,
    confirmPassword,
    setConfirmPassword,
    agreeTerms,
    setAgreeTerms,
    errorMessage,
    emailDeliveryFailed,
    isResending,
    isLoading,
    handleLoginSubmit,
    handleRegisterSubmit,
    handleResendVerification,
  };
}
