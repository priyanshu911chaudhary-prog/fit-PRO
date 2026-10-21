import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AuthRegisterFormProps {
  name: string;
  onNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  agreeTerms: boolean;
  onAgreeTermsChange: (checked: boolean) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function AuthRegisterForm({
  name,
  onNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  agreeTerms,
  onAgreeTermsChange,
  showPassword,
  onToggleShowPassword,
  isLoading,
  onSubmit,
}: AuthRegisterFormProps) {
  return (
    <motion.form
      key="register-form"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.15 }}
      onSubmit={onSubmit}
      className="space-y-3.5"
    >
      <div className="space-y-1">
        <Label htmlFor="register-name" className="text-xs font-semibold">
          Full Name
        </Label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="register-name"
            name="name"
            type="text"
            placeholder="Alex Mercer"
            className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="register-email" className="text-xs font-semibold">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="register-email"
            name="email"
            type="email"
            placeholder="alex@example.com"
            className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="register-password" className="text-xs font-semibold">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="register-password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 chars with symbols"
            className="pl-9 pr-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword" className="text-xs font-semibold">
          Confirm Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Repeat password"
            className="pl-9 bg-background/50 text-sm focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-start gap-2 pt-0.5">
        <input
          id="agreeTerms"
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => onAgreeTermsChange(e.target.checked)}
          className="mt-0.5 size-3.5 rounded border-border accent-emerald-500 cursor-pointer"
          required
        />
        <Label
          htmlFor="agreeTerms"
          className="text-[11px] text-muted-foreground font-normal leading-relaxed cursor-pointer"
        >
          I agree to the Terms of Service and acknowledge consulting a physician before training.
        </Label>
      </div>

      <Button
        type="submit"
        id="register-submit-btn"
        disabled={isLoading}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-10 shadow-sm shadow-emerald-500/25 active:scale-[0.99] transition-all cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Creating Account...
          </>
        ) : (
          <>
            Create Account
            <ArrowRight className="size-4 ml-1.5" />
          </>
        )}
      </Button>
    </motion.form>
  );
}
