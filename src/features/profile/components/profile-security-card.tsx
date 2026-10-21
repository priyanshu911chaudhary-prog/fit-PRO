"use client";

import React from "react";
import { Lock, ShieldCheck, CheckCircle2, Loader2, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProfileSecurityCardProps {
  isOAuthUser: boolean;
  effectiveAuthProvider: string;
  oldPassword: string;
  setOldPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isChangingPassword: boolean;
  onChangePassword: (e: React.FormEvent) => void;
}

export function ProfileSecurityCard({
  isOAuthUser,
  effectiveAuthProvider,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isChangingPassword,
  onChangePassword,
}: ProfileSecurityCardProps) {
  return (
    <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-emerald-400" />
          <CardTitle className="text-base font-bold text-foreground">
            Security & Authentication
          </CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {isOAuthUser
            ? "Federated identity provider and single sign-on security"
            : "Update your account password to protect your biometric data"}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {isOAuthUser ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    Single Sign-On Active
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                  >
                    {effectiveAuthProvider === "google"
                      ? "Google Account"
                      : "Microsoft Workspace"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You signed in via {effectiveAuthProvider === "google" ? "Google" : "Microsoft"}.
                  Your account does not require a local password; security, authentication, and
                  multi-factor verification are managed directly by your identity provider.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-mono px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-background/50">
                <CheckCircle2 className="size-3.5" />
                SSO Secured
              </span>
            </div>
          </div>
        ) : (
          <form id="change-password-form" onSubmit={onChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="oldPassword"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Current Password
                </Label>
                <Input
                  id="oldPassword"
                  type="password"
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="newPassword"
                  className="text-xs font-medium text-muted-foreground"
                >
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/50 border-border/70 text-foreground font-mono text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                id="change-password-btn"
                disabled={isChangingPassword}
                variant="outline"
                className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-xs h-9 px-4 cursor-pointer font-medium"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Updating Credentials...
                  </>
                ) : (
                  <>
                    <KeyRound className="size-3.5 mr-2" />
                    Update Credentials
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
