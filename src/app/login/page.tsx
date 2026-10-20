"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { TabbedAuthCard } from "@/components/auth/tabbed-auth-card";

function LoginContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTarget = searchParams.get("redirect");

  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const destination =
        !user.hasProfile
          ? "/onboarding"
          : redirectTarget && !redirectTarget.startsWith("/login")
          ? redirectTarget.startsWith("/")
            ? redirectTarget
            : `/${redirectTarget}`
          : "/dashboard";
      router.replace(destination);
    }
  }, [isLoading, isAuthenticated, user, redirectTarget, router]);

  return (
    <div className="w-full flex items-center justify-center">
      <TabbedAuthCard defaultMode="login" redirectTarget={redirectTarget || undefined} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background relative overflow-hidden">
      {/* Restrained Ambient Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      <Suspense
        fallback={
          <div className="w-full max-w-[420px] h-[520px] rounded-3xl bg-card/40 border border-border/40 animate-pulse mx-auto" />
        }
      >
        <LoginContent />
      </Suspense>
    </div>
  );
}
