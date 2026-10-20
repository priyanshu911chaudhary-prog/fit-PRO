"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "cn";

interface TabbedAuthCardProps {
  defaultMode?: "login" | "register";
  redirectTarget?: string;
}

export function TabbedAuthCard({
  defaultMode = "login",
  redirectTarget,
}: TabbedAuthCardProps) {
  const router = useRouter();
  const { login, register, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(defaultMode);

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

  const switchMode = (newMode: "login" | "register") => {
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

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage("Please fill in all required fields.");
      toast.error("Please fill in all required fields.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      setErrorMessage("Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.");
      toast.error("Password must be at least 8 characters with uppercase, lowercase, numbers, and symbols.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Please agree to the Terms of Service.");
      toast.error("Please agree to the Terms of Service.");
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

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Main Glassmorphic Card */}
      <div className="rounded-3xl border border-border/70 bg-card/85 dark:bg-card/75 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            href="/"
            className="flex size-11 items-center justify-center rounded-2xl bg-card border border-border/80 shadow-xs hover:border-emerald-500/40 hover:scale-105 transition-all duration-200"
          >
            <FitProLogo size={24} />
          </Link>
          <div className="space-y-0.5">
            <h1 className="font-heading text-xl font-black tracking-tight text-foreground">
              fit-PRO
            </h1>
            <p className="text-xs text-muted-foreground">
              {mode === "login"
                ? "Welcome back. Access your athletic telemetry."
                : "Join fit-PRO. Forge your training protocol."}
            </p>
          </div>
        </div>

        {/* Segmented Tab Slider */}
        <div className="grid grid-cols-2 p-1 bg-muted/40 border border-border/60 rounded-xl relative select-none">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={cn(
              "relative z-10 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
              mode === "login"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === "login" && (
              <motion.span
                layoutId="auth-tab-pill"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-background dark:bg-card rounded-lg border border-border/80 shadow-xs -z-10"
              />
            )}
            Sign In
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={cn(
              "relative z-10 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer",
              mode === "register"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {mode === "register" && (
              <motion.span
                layoutId="auth-tab-pill"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="absolute inset-0 bg-background dark:bg-card rounded-lg border border-border/80 shadow-xs -z-10"
              />
            )}
            Create Account
          </button>
        </div>

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
          <div
            id="email-delivery-warning"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-amber-500"
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span>Verification Email Pending</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your account was created, but email dispatch was throttled.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isResending}
              onClick={handleResendVerification}
              className="w-full text-xs h-7.5"
            >
              {isResending ? (
                <Loader2 className="size-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3 mr-1.5" />
              )}
              Resend Email
            </Button>
          </div>
        )}

        {/* Dynamic Mode Forms with Smooth Animation */}
        <AnimatePresence mode="wait">
          {mode === "login" ? (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleLoginSubmit}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="athlete@example.com"
                    className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-xs font-semibold">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-9 pr-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    data-testid="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                id="login-submit-btn"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 shadow-sm shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="size-4 ml-1.5" />
                  </>
                )}
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="register-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleRegisterSubmit}
              className="space-y-3.5"
            >
              <div className="space-y-1">
                <Label htmlFor="register-name" className="text-xs font-semibold">
                  Full Name
                </Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="register-name"
                    name="name"
                    type="text"
                    placeholder="Alex Mercer"
                    className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="register-email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="register-email"
                    name="email"
                    type="email"
                    placeholder="alex@example.com"
                    className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="register-password" className="text-xs font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 chars with symbols"
                    className="pl-9 pr-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat password"
                    className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-0.5">
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 size-3.5 rounded border-border accent-emerald-500 cursor-pointer"
                  required
                />
                <Label
                  htmlFor="agreeTerms"
                  className="text-[11px] text-muted-foreground font-normal leading-relaxed cursor-pointer"
                >
                  I agree to the Terms of Service and acknowledge consulting a physician before training.
                </Label>
              </div>

              <Button
                type="submit"
                id="register-submit-btn"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 shadow-sm shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="size-4 ml-1.5" />
                  </>
                )}
              </Button>
            </motion.form>
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
