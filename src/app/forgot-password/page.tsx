"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res.success) {
        setIsSubmitted(true);
      }
    } catch {
      // Non-enumerating: even on error, show the same submitted message
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 shadow-md">
            <KeyRound className="size-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Forgot Password</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Enter your email and we&apos;ll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isSubmitted ? (
            <div className="space-y-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Reset Request Processed
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If an account exists with that email address, you will receive password reset instructions shortly. The link expires in 15 minutes.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  <>
                    Send Reset Instructions
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
    </div>
  );
}
