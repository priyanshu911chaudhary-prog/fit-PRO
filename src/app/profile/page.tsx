"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Scale,
  Flame,
  Activity,
  Save,
  Loader2,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Lock,
  KeyRound,
  Zap,
  Dumbbell,
  HeartPulse,
  Award,
  CheckCircle2,
  Sliders,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserDietaryPreferenceEnum,
  EquipmentEnum,
  ExperienceLevelEnum,
} from "@/constants";
import { cn } from "cn";

interface ProfileData {
  _id?: string;
  gender: string;
  dob: string | Date;
  age: number;
  height: number;
  weight: number;
  fitnessGoal: string;
  activityLevel: string;
  dietaryPreference: string;
  experienceLevel: string;
  equipmentAvailable: string[];
  isProfileComplete?: boolean;
}

interface ProfileMetrics {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  age: number;
}

const GOAL_ICONS: Record<string, React.ElementType> = {
  [UserGoalEnum.MUSCLE_BUILDING]: Dumbbell,
  [UserGoalEnum.WEIGHT_LOSS]: Flame,
  [UserGoalEnum.STRENGTH_TRAINING]: Zap,
  [UserGoalEnum.ENDURANCE_TRAINING]: Activity,
  [UserGoalEnum.GENERAL_FITNESS]: HeartPulse,
};

function ProfileContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [metrics, setMetrics] = useState<ProfileMetrics | null>(null);
  const [authProvider, setAuthProvider] = useState<string>("local");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveAuthProvider = user?.authProvider || authProvider || "local";
  const isOAuthUser = effectiveAuthProvider === "google" || effectiveAuthProvider === "microsoft";

  // Editable Form fields
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(70);
  const [fitnessGoal, setFitnessGoal] = useState<string>(UserGoalEnum.MUSCLE_BUILDING);
  const [activityLevel, setActivityLevel] = useState<string>(UserActivityLevelEnum.MODERATELY_ACTIVE);
  const [dietaryPreference, setDietaryPreference] = useState<string>(UserDietaryPreferenceEnum.NONE);
  const [experienceLevel, setExperienceLevel] = useState<string>(ExperienceLevelEnum.INTERMEDIATE);
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([EquipmentEnum.DUMBBELL]);

  useEffect(() => {
    let isMounted = true;
    apiClient<{ profile: ProfileData; metrics?: ProfileMetrics; isProfileComplete?: boolean; authProvider?: string }>("/api/profile")
      .then((res) => {
        if (isMounted) {
          if (res.data?.authProvider) {
            setAuthProvider(res.data.authProvider);
          }
          if (res.data?.profile) {
            const p = res.data.profile;
            setProfile(p);
            if (res.data.metrics) {
              setMetrics(res.data.metrics);
            }
            setHeight(p.height);
            setWeight(p.weight);
            setFitnessGoal(p.fitnessGoal || UserGoalEnum.GENERAL_FITNESS);
            setActivityLevel(p.activityLevel || UserActivityLevelEnum.SEDENTARY);
            setDietaryPreference(p.dietaryPreference || UserDietaryPreferenceEnum.NONE);
            setExperienceLevel(p.experienceLevel || ExperienceLevelEnum.BEGINNER);
            setEquipmentAvailable(
              Array.isArray(p.equipmentAvailable) && p.equipmentAvailable.length > 0
                ? p.equipmentAvailable
                : [EquipmentEnum.BODYWEIGHT]
            );
          } else {
            toast.info("No profile found. Please complete onboarding first.");
            router.push("/onboarding");
          }
        }
      })
      .catch((err) => {
        console.error("Error loading profile:", err);
        toast.error("Failed to load profile. Please complete onboarding or try again.");
        router.push("/onboarding");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const toggleEquipment = (eq: string) => {
    if (equipmentAvailable.includes(eq)) {
      if (equipmentAvailable.length > 1) {
        setEquipmentAvailable(equipmentAvailable.filter((e) => e !== eq));
      }
    } else {
      setEquipmentAvailable([...equipmentAvailable, eq]);
    }
  };

  const formatDob = (dob?: string | Date) => {
    if (!dob) return "N/A";
    try {
      const d = new Date(dob);
      if (isNaN(d.getTime())) return String(dob);
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return String(dob);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await apiClient<{ profile: ProfileData; metrics?: ProfileMetrics }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          height: Number(height),
          weight: Number(weight),
          fitnessGoal,
          activityLevel,
          dietaryPreference,
          experienceLevel,
          equipmentAvailable,
        }),
      });

      if (res.success && res.data) {
        if (res.data.profile) {
          setProfile(res.data.profile);
        }
        if (res.data.metrics) {
          setMetrics(res.data.metrics);
        }
        toast.success("Bio-passport baseline updated successfully!");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to update profile";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password Form state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await apiClient("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (res.success) {
        toast.success("Security credentials updated successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to change password";
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="size-8 text-emerald-400 animate-spin" />
        <p className="text-xs font-mono text-muted-foreground animate-pulse">
          Calibrating athlete bio-passport...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 space-y-8">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="size-3.5" />
                ATHLETE BIO-PASSPORT
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                METABOLIC ENGINE SYNCED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Athlete Profile & Biometrics
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Configure baseline anthropometrics, active energy expenditure multipliers, and workout gear.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Derived Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Derived BMI */}
        <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Scale className="size-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-mono text-muted-foreground">Anthropometric BMI</p>
              <p className="text-3xl font-extrabold font-mono text-foreground">
                {metrics?.bmi ?? "—"}
              </p>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-mono font-bold capitalize">
                {metrics?.bmiCategory ? `${metrics.bmiCategory} category` : "Calibrated"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Basal BMR */}
        <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Flame className="size-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-mono text-muted-foreground">Basal BMR Floor</p>
              <p className="text-3xl font-extrabold font-mono text-foreground">
                {metrics?.bmr ?? "—"}{" "}
                {metrics?.bmr ? <span className="text-xs font-normal font-sans text-muted-foreground">kcal/d</span> : null}
              </p>
              <p className="text-[11px] text-amber-400 font-mono">Resting Metabolic Baseline</p>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Active TDEE */}
        <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Activity className="size-6" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-mono text-muted-foreground">Active TDEE Target</p>
              <p className="text-3xl font-extrabold font-mono text-foreground">
                {metrics?.tdee ?? "—"}{" "}
                {metrics?.tdee ? <span className="text-xs font-normal font-sans text-muted-foreground">kcal/d</span> : null}
              </p>
              <p className="text-[11px] text-cyan-400 font-mono">Maintenance Caloric Budget</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Main Settings Form */}
      <form onSubmit={handleSave}>
        <Card className="border-border/70 bg-[#0B0F0E]/80 backdrop-blur-xl shadow-xl">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="size-4 text-emerald-400" />
              Biometrics & Calibration Parameters
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Adjusting your biometric specifications dynamically re-computes your metabolic expenditure baselines.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {/* Non-editable bio-passport card */}
            {profile && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-card/40 border border-border/60 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                    <UserIcon className="size-3.5 text-emerald-400" /> Biological Sex
                  </span>
                  <span className="font-bold text-foreground capitalize">{profile.gender}</span>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                    <Calendar className="size-3.5 text-cyan-400" /> Date of Birth
                  </span>
                  <span className="font-bold text-foreground">{formatDob(profile.dob)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1 text-[11px]">Calibrated Age</span>
                  <span className="font-bold text-foreground">{profile.age || metrics?.age || "—"} years</span>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1.5 mb-1 text-[11px]">
                    <ShieldCheck className="size-3.5 text-emerald-400" /> Bio-Passport Status
                  </span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Verified
                  </span>
                </div>
              </div>
            )}

            {/* Editable Height & Weight */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="height" className="text-xs font-medium text-muted-foreground">
                  Height (cm)
                </Label>
                <Input
                  id="height"
                  type="number"
                  min={50}
                  max={250}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="bg-background/50 border-border/70 text-foreground font-mono text-sm h-10"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-xs font-medium text-muted-foreground">
                  Body Weight (kg)
                </Label>
                <Input
                  id="weight"
                  type="number"
                  min={20}
                  max={300}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="bg-background/50 border-border/70 text-foreground font-mono text-sm h-10"
                  required
                />
              </div>
            </div>

            {/* Fitness Goal */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Primary Fitness Protocol
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(Object.values(UserGoalEnum) as string[]).map((goal) => {
                  const isSelected = fitnessGoal === goal;
                  const IconComp = GOAL_ICONS[goal] || Activity;

                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setFitnessGoal(goal)}
                      className={cn(
                        "p-3 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer flex flex-col justify-between space-y-2",
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                          : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <IconComp className={cn("size-4", isSelected ? "text-emerald-400" : "text-muted-foreground")} />
                      <span className="leading-tight">{goal.replace(/_/g, " ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity Level */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Activity & Exertion Level
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.values(UserActivityLevelEnum) as string[]).map((lvl) => {
                  const isSelected = activityLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setActivityLevel(lvl)}
                      className={cn(
                        "p-3 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer",
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                          : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      <span className="block font-semibold">{lvl.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {lvl === UserActivityLevelEnum.SEDENTARY && "Desk job, low exercise"}
                        {lvl === UserActivityLevelEnum.LIGHTLY_ACTIVE && "1–3 sessions/wk"}
                        {lvl === UserActivityLevelEnum.MODERATELY_ACTIVE && "3–5 training days/wk"}
                        {lvl === UserActivityLevelEnum.VERY_ACTIVE && "6–7 intensive sessions"}
                        {lvl === UserActivityLevelEnum.SUPER_ACTIVE && "Athletic heavy volume"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience & Diet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Experience Tier
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.values(ExperienceLevelEnum) as string[]).map((exp) => {
                    const isSelected = experienceLevel === exp;
                    return (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => setExperienceLevel(exp)}
                        className={cn(
                          "p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer font-medium",
                          isSelected
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                            : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                        )}
                      >
                        {exp}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Dietary Strategy
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.values(UserDietaryPreferenceEnum) as string[]).map((diet) => {
                    const isSelected = dietaryPreference === diet;
                    return (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => setDietaryPreference(diet)}
                        className={cn(
                          "p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer font-medium",
                          isSelected
                            ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-semibold shadow-xs"
                            : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                        )}
                      >
                        {diet.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Equipment Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Available Training Equipment
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {(Object.values(EquipmentEnum) as string[]).map((eq) => {
                  const isSelected = equipmentAvailable.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleEquipment(eq)}
                      className={cn(
                        "p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer font-medium",
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 font-semibold shadow-xs"
                          : "border-border/60 bg-card/40 hover:bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {eq.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/40">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary text-primary-foreground font-semibold text-xs h-10 px-5 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 cursor-pointer transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Committing Calibration...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Commit Bio-Passport Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* 4. Security & Credentials Vault */}
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
                    <Badge variant="outline" className="text-[10px] uppercase font-mono border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                      {effectiveAuthProvider === "google" ? "Google Account" : "Microsoft Workspace"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You signed in via {effectiveAuthProvider === "google" ? "Google" : "Microsoft"}. Your account does not require a local password; security, authentication, and multi-factor verification are managed directly by your identity provider.
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
            <form id="change-password-form" onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="oldPassword" className="text-xs font-medium text-muted-foreground">
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
                  <Label htmlFor="newPassword" className="text-xs font-medium text-muted-foreground">
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
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-muted-foreground">
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
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-6xl p-8">
          <div className="w-full h-96 rounded-2xl bg-[#0B0F0E]/80 border border-border/70 animate-pulse" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
