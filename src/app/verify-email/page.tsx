"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex flex-1 items-center justify-center p-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-3 text-center pb-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 shadow-md">
            <Mail className="size-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Check Your Inbox</CardTitle>
          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
            We&apos;ve sent a verification link to your email address. Please click the link to activate your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/50 bg-muted/40 p-4 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Didn&apos;t receive the email?</p>
            <p>1. Check your spam or promotions folder.</p>
            <p>2. The verification link expires in 24 hours.</p>
            <p>3. Use the form below to request a new link.</p>
          </div>

          <form onSubmit={handleResend} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resend-email" className="text-xs">Your Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="resend-email"
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
              disabled={isResending || resendSent}
              variant="outline"
              className="w-full text-xs font-semibold"
            >
              {isResending ? (
                <>
                  <Loader2 className="size-3.5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendSent ? (
                "Link Sent! Check Inbox"
              ) : (
                <>
                  <Send className="size-3.5 mr-2" />
                  Resend Verification Email
                </>
              )}
            </Button>
          </form>
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
