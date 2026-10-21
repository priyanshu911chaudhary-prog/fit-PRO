"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function CtaSection() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-center space-y-8">
      <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
        Ready to experience precision fitness tracking?
      </h2>
      <p className="text-muted-foreground max-w-xl mx-auto text-base">
        Join athletes training with custom workout splits, automated hydration tracking, and zero
        guesswork.
      </p>
      <div>
        <Link
          href="/register"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 px-8 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          Create Your Free Account
          <ArrowRight className="size-4 ml-2" />
        </Link>
      </div>
    </section>
  );
}
