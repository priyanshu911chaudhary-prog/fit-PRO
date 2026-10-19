"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Dumbbell, Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { toast } from "sonner";

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const verified = searchParams.get("verified");
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login({ email, password });
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Invalid email or password";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl relative z-10">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25">
          <Dumbbell className="size-6 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome Back</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Sign in to access your AI workout & meal programs
        </CardDescription>

        {registered && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
            Account created! Please verify your email or sign in below.
          </div>
        )}

        {verified && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
            Email verified successfully! You can now sign in.
          </div>
        )}

        {oauthError && (
          <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-500">
            {oauthError}
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit} action="javascript:void(0);">
        <CardContent className="space-y-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
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

          <Button
            type="submit"
            id="login-submit-btn"
            disabled={isSubmitting}
            className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="size-4 ml-2" />
              </>
            )}
          </Button>

          <OAuthButtons />
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/40 pt-4">
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-semibold text-indigo-500 hover:text-indigo-400">
              Create one now
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense fallback={<div className="w-full max-w-md h-96 rounded-xl bg-card/50 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
