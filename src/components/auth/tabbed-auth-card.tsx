"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { useAuthForm } from "@/features/auth/hooks/use-auth-form";
import { AuthCardHeader } from "@/features/auth/components/auth-card-header";
import { AuthModeTabs } from "@/features/auth/components/auth-mode-tabs";
import { AuthEmailWarning } from "@/features/auth/components/auth-email-warning";
import { AuthLoginForm } from "@/features/auth/components/auth-login-form";
import { AuthRegisterForm } from "@/features/auth/components/auth-register-form";
import type { TabbedAuthCardProps } from "@/features/auth/types";

export function TabbedAuthCard({
  defaultMode = "login",
  redirectTarget,
}: TabbedAuthCardProps) {
  const {
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
  } = useAuthForm({ defaultMode, redirectTarget });

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Main Glassmorphic Card */}
      <div className="rounded-3xl border border-border/70 bg-card/85 dark:bg-card/75 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />

        {/* Brand Header */}
        <AuthCardHeader mode={mode} />

        {/* Segmented Tab Slider */}
        <AuthModeTabs mode={mode} onSwitchMode={switchMode} />

        {/* Global Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            data-testid="auth-error-banner"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive text-left flex items-start gap-2"
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Throttled Verification Notice (Register only) */}
        {emailDeliveryFailed && (
          <AuthEmailWarning
            isResending={isResending}
            onResend={handleResendVerification}
          />
        )}

        {/* Dynamic Mode Forms with Smooth Animation */}
        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <AuthLoginForm
              email={email}
              onEmailChange={setEmail}
              password={password}
              onPasswordChange={setPassword}
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
              isLoading={isLoading}
              onSubmit={handleLoginSubmit}
            />
          ) : (
            <AuthRegisterForm
              name={name}
              onNameChange={setName}
              email={email}
              onEmailChange={setEmail}
              password={password}
              onPasswordChange={setPassword}
              confirmPassword={confirmPassword}
              onConfirmPasswordChange={setConfirmPassword}
              agreeTerms={agreeTerms}
              onAgreeTermsChange={setAgreeTerms}
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
              isLoading={isLoading}
              onSubmit={handleRegisterSubmit}
            />
          )}
        </AnimatePresence>

        {/* OAuth Buttons Section */}
        <div className="pt-2">
          <OAuthButtons />
        </div>
      </div>
    </div>
  );
}
