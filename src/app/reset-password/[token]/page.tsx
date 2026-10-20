"use client";

import React, { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

function ResetPasswordForm() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast.error("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient(`/api/auth/reset-password/${token}`, {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (res.success) {
        setIsSuccess(true);
        toast.success(res.message || "Password has been reset successfully!");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Password reset failed or token is expired.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto rounded-3xl border border-border/70 bg-card/85 dark:bg-card/75 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6">
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
            Set New Password
          </h1>
          <p className="text-xs text-muted-foreground">
            Choose a secure password with at least 8 characters.
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">
              Password Updated
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Redirecting you to sign in...
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 characters"
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

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat new password"
                className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 shadow-sm shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                Save New Password
                <ArrowRight className="size-4 ml-1.5" />
              </>
            )}
          </Button>
        </form>
      )}

      <div className="pt-2 border-t border-border/40 text-center">
        <Link
          href="/login"
          className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordTokenPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      <Suspense fallback={<div className="w-full max-w-[420px] h-80 rounded-3xl bg-card/40 animate-pulse mx-auto" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
