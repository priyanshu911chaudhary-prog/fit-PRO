"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export interface LoginFormCardProps {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void> | void;
  isLoading?: boolean;
  errorMessage?: string | null;
  onForgotPasswordClick?: () => void;
  onRegisterClick?: () => void;
}

export function LoginFormCard({
  onSubmit,
  isLoading = false,
  errorMessage,
  onForgotPasswordClick,
  onRegisterClick,
}: LoginFormCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!email.trim() || !password) {
      setValidationError("Please enter both email and password.");
      return;
    }

    await onSubmit({ email: email.trim(), password });
  };

  const displayedError = errorMessage || validationError;

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/80 backdrop-blur-xl shadow-xl">
      <CardHeader className="space-y-1 text-center pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight">Sign In</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your credentials to access your fitness plans
        </CardDescription>

        {displayedError && (
          <div
            data-testid="auth-error-banner"
            role="alert"
            className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive text-left"
          >
            {displayedError}
          </div>
        )}
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-email"
                type="email"
                placeholder="alex@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Password</Label>
              {onForgotPasswordClick && (
                <button
                  type="button"
                  onClick={onForgotPasswordClick}
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9 pr-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                data-testid="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            id="login-submit-button"
            disabled={isLoading}
            className="w-full mt-2"
          >
            {isLoading ? (
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
        </CardContent>

        {onRegisterClick && (
          <CardFooter className="flex justify-center border-t border-border/40 pt-4">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onRegisterClick}
                className="font-semibold text-primary hover:underline"
              >
                Sign up
              </button>
            </p>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
