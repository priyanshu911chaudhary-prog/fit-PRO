"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

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
              Reset Password
            </h1>
            <p className="text-xs text-muted-foreground">
              Enter your email and we&apos;ll send you instructions to recover access.
            </p>
          </div>
        </div>

        {isSubmitted ? (
          <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                Reset Link Dispatched
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If an account exists for <span className="font-semibold text-foreground">{email}</span>, you will receive password reset instructions. The link expires in 15 minutes.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="athlete@example.com"
                  className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  Sending Link...
                </>
              ) : (
                <>
                  Send Reset Link
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
    </div>
  );
}
