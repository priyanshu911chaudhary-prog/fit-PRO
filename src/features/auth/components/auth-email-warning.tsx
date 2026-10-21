import React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthEmailWarningProps {
  isResending: boolean;
  onResend: () => void;
}

export function AuthEmailWarning({ isResending, onResend }: AuthEmailWarningProps) {
  return (
    <div
      id="email-delivery-warning"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 text-amber-500"
    >
      <div className="flex items-center gap-1.5 font-semibold text-xs">
        <AlertTriangle className="size-3.5 shrink-0" />
        <span>Verification Email Pending</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Your account was created, but email dispatch was throttled.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isResending}
        onClick={onResend}
        className="w-full text-xs h-7.5"
      >
        {isResending ? (
          <Loader2 className="size-3 mr-1.5 animate-spin" />
        ) : (
          <RefreshCw className="size-3 mr-1.5" />
        )}
        Resend Email
      </Button>
    </div>
  );
}
