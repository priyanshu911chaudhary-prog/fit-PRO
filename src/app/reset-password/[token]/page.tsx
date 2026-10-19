"use client";

import React, { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
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
        }, 2000);
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
    <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl">
      <CardHeader className="space-y-3 text-center pb-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 shadow-md">
          <Lock className="size-7" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Set New Password</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Please choose a secure password with at least 6 characters
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isSuccess ? (
          <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Password Updated!
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Redirecting to sign-in page...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
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
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  className="pl-9 bg-background/50"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  Save New Password
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/40 pt-4">
        <Link
          href="/login"
          className="flex items-center text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
        >
          Back to Sign In
          <ArrowRight className="size-3.5 ml-1" />
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordTokenPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="w-full max-w-md h-80 rounded-xl bg-card/50 animate-pulse" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
