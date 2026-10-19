"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";

function VerifyEmailTokenContent() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("Verifying your email address...");

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      Promise.resolve().then(() => {
        if (isMounted) {
          setStatus("error");
          setMessage("Verification token is missing.");
        }
      });
      return;
    }

    apiClient("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (isMounted) {
          if (res.success) {
            setStatus("success");
            setMessage(res.message || "Your email has been verified successfully!");
          } else {
            setStatus("error");
            setMessage(res.message || "Failed to verify email.");
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setStatus("error");
          const errorMsg =
            (err as { response?: { message?: string } })?.response?.message ||
            (err as Error).message ||
            "Verification link is invalid or has expired.";
          setMessage(errorMsg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <Card className="w-full max-w-md border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl text-center">
      <CardHeader className="space-y-3 pb-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl">
          {status === "loading" && (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Loader2 className="size-8 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="size-8" />
            </div>
          )}
          {status === "error" && (
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 animate-in zoom-in-75 duration-300">
              <XCircle className="size-8" />
            </div>
          )}
        </div>

        <CardTitle className="text-2xl font-bold tracking-tight">
          {status === "loading" && "Verifying Email"}
          {status === "success" && "Email Verified!"}
          {status === "error" && "Verification Failed"}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">{message}</CardDescription>
      </CardHeader>

      <CardContent className="pt-2">
        {status === "success" && (
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-md shadow-emerald-500/20"
            onClick={() => router.push("/login?verified=1")}
          >
            Continue to Sign In
            <ArrowRight className="size-4 ml-2" />
          </Button>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/verify-email")}
            >
              <Mail className="size-4 mr-2" />
              Request New Verification Link
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => router.push("/login")}
            >
              Back to Sign In
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/40 pt-4">
        <p className="text-xs text-muted-foreground">AI Fitness Platform</p>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailTokenPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="w-full max-w-md h-80 rounded-xl bg-card/50 animate-pulse" />}>
        <VerifyEmailTokenContent />
      </Suspense>
    </div>
  );
}
