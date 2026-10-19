"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OAuthButtonsProps {
  onSuccess?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (res: { credential?: string }) => void;
            auto_select?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (
            notification?: (n: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
            }) => void
          ) => void;
        };
      };
    };
  }
}

export function OAuthButtons({ onSuccess }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [gisLoaded, setGisLoaded] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const isGoogleConfigured =
    Boolean(googleClientId) &&
    googleClientId !== "your_google_client_id" &&
    googleClientId !== "dummy" &&
    googleClientId !== "undefined" &&
    (googleClientId?.includes(".apps.googleusercontent.com") ||
      googleClientId?.includes(".googleusercontent.com"));

  useEffect(() => {
    if (
      !isGoogleConfigured ||
      !googleClientId ||
      !gisLoaded ||
      typeof window === "undefined" ||
      !window.google?.accounts?.id
    ) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          if (!response.credential) return;
          setLoadingProvider("google");
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: response.credential }),
            });
            const data = await res.json();
            if (data.success) {
              toast.success("Successfully authenticated with Google!");
              if (onSuccess) {
                onSuccess();
              } else {
                window.location.href = "/dashboard";
              }
            } else {
              toast.error(data.message || "Google authentication failed");
            }
          } catch {
            toast.error("Network error during Google authentication");
          } finally {
            setLoadingProvider(null);
          }
        },
      });

      // Attempt non-intrusive Google One-Tap prompt with notification callback
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Handled silently
        }
      });
    } catch {
      // Handled silently
    }
  }, [gisLoaded, googleClientId, isGoogleConfigured, onSuccess]);

  const handleGoogleClick = () => {
    setLoadingProvider("google");
    window.location.href = "/api/auth/google";
  };

  const handleMicrosoftClick = () => {
    setLoadingProvider("microsoft");
    window.location.href = "/api/auth/microsoft";
  };

  return (
    <div className="space-y-3">
      {isGoogleConfigured && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGisLoaded(true)}
        />
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          id="google-signin-btn"
          variant="outline"
          disabled={!!loadingProvider}
          onClick={handleGoogleClick}
          className="w-full flex items-center justify-center gap-2 border-border/80 bg-background/50 hover:bg-muted/70 transition-colors cursor-pointer"
        >
          {loadingProvider === "google" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="text-xs font-semibold">Google</span>
        </Button>

        <Button
          type="button"
          id="microsoft-signin-btn"
          variant="outline"
          disabled={!!loadingProvider}
          onClick={handleMicrosoftClick}
          className="w-full flex items-center justify-center gap-2 border-border/80 bg-background/50 hover:bg-muted/70 transition-colors"
        >
          {loadingProvider === "microsoft" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <svg className="size-4" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
          )}
          <span className="text-xs font-semibold">Microsoft</span>
        </Button>
      </div>
    </div>
  );
}
