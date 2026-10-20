"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    try {
      setIsResending(true);
      const res = await apiClient("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (res.success) {
        setResendSent(true);
        toast.success(res.message || "Verification link sent! Please check your inbox.");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to resend verification email";
      toast.error(msg);
    } finally {
      setIsResending(false);
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
              Check Your Inbox
            </h1>
            <p className="text-xs text-muted-foreground">
              We&apos;ve sent a verification link to activate your athlete account.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-bold text-foreground">Didn&apos;t receive the email?</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Check your spam or promotions folder</li>
            <li>Verification links expire in 24 hours</li>
            <li>Request a new link using the form below</li>
          </ul>
        </div>

        <form onSubmit={handleResend} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="resend-email" className="text-xs font-semibold">Your Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="resend-email"
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
            disabled={isResending || resendSent}
            variant="outline"
            className="w-full text-xs font-bold h-10 border-border/80 hover:bg-muted/70 cursor-pointer"
          >
            {isResending ? (
              <>
                <Loader2 className="size-3.5 mr-2 animate-spin" />
                Sending...
              </>
            ) : resendSent ? (
              <>
                <CheckCircle2 className="size-3.5 mr-2 text-emerald-400" />
                Link Sent! Check Inbox
              </>
            ) : (
              <>
                <Send className="size-3.5 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>
        </form>

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
