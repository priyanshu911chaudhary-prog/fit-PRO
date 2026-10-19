"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled client error in fit-PRO:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full p-8 rounded-2xl border border-destructive/30 bg-card/80 backdrop-blur-md text-center space-y-6 shadow-2xl">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle className="size-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground">
            {error?.message || "An unexpected error occurred while loading this view."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            Try again
          </Button>

          <Link href="/dashboard">
            <Button className="bg-primary text-primary-foreground flex items-center gap-2">
              <Home className="size-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
