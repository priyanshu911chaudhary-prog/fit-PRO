"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Dumbbell, Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { toast } from "sonner";

export default function RegisterPage() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error("Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special symbol.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please agree to the Terms of Service and Health Guidelines.");
      return;
    }

    try {
      setIsSubmitting(true);
      setEmailDeliveryFailed(false);
      const res = await register({ name, email, password });
      if (res.success && res.emailSent === false) {
        setRegisteredEmail(email);
        setEmailDeliveryFailed(true);
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Registration failed. Please check your details.";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    try {
      setIsResending(true);
      const res = await (await import("@/lib/api-client")).apiClient("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email: registeredEmail }),
      });
      if (res.success) {
        toast.success("Verification email resent! Please check your inbox.");
      }
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to resend verification email.";
      toast.error(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25">
            <Dumbbell className="size-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create Your Account</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Join AI Fitness and get your bespoke AI workout & nutrition plan
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit} action="javascript:void(0);">
          <CardContent className="space-y-4">
            {emailDeliveryFailed && (
              <div
                id="email-delivery-warning"
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5 text-amber-600 dark:text-amber-400"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                  <span className="font-semibold text-xs text-amber-600 dark:text-amber-300">
                    Verification Email Not Delivered
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your account was successfully created, but our mail provider could not deliver the verification link to{" "}
                  <strong className="text-foreground">{registeredEmail}</strong>. Please click below to resend.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  id="resend-verification-button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="w-full text-xs font-medium border-amber-500/40 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      Resending Link...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-3.5 mr-1.5" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Alex Mercer"
                  className="pl-9 bg-background/50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@example.com"
                  className="pl-9 bg-background/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  className="pl-9 pr-9 bg-background/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat your password"
                  className="pl-9 bg-background/50"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="terms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="size-4 rounded border-border text-indigo-600 focus:ring-indigo-500 mt-0.5 cursor-pointer"
                required
              />
              <Label htmlFor="terms" className="text-xs text-muted-foreground leading-snug cursor-pointer font-normal">
                I agree to the Terms of Service and acknowledge the AI Fitness health & safety guidelines.
              </Label>
            </div>

            <Button
              type="submit"
              id="register-submit-btn"
              disabled={isSubmitting}
              className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>

            <OAuthButtons />
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border/40 pt-4">
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-indigo-500 hover:text-indigo-400">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
