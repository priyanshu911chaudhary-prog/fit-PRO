"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserDietaryPreferenceEnum,
  EquipmentEnum,
  ExperienceLevelEnum,
} from "@/constants";

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

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [metrics, setMetrics] = useState<ProfileMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
    apiClient<{ profile: ProfileData; metrics?: ProfileMetrics; isProfileComplete?: boolean }>("/api/profile")
      .then((res) => {
        if (isMounted) {
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
        toast.success("Profile updated successfully!");
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
        toast.success("Password updated successfully!");
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
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 text-indigo-500 animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading fitness profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Fitness Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your biometrics, target metrics, and workout preferences
          </p>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
              <Scale className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Derived BMI</p>
              <p className="text-2xl font-extrabold text-foreground">{metrics?.bmi ?? "—"}</p>
              <p className="text-[11px] text-indigo-400 capitalize">
                {metrics?.bmiCategory ? `${metrics.bmiCategory} category` : "Calculated Metric"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Flame className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">BMR (Basal)</p>
              <p className="text-2xl font-extrabold text-foreground">
                {metrics?.bmr ?? "—"}{" "}
                {metrics?.bmr ? <span className="text-xs font-normal text-muted-foreground">kcal</span> : null}
              </p>
              <p className="text-[11px] text-emerald-400">Resting Expenditure</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-xs">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-400">
              <Activity className="size-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">TDEE Target</p>
              <p className="text-2xl font-extrabold text-foreground">
                {metrics?.tdee ?? "—"}{" "}
                {metrics?.tdee ? <span className="text-xs font-normal text-muted-foreground">kcal</span> : null}
              </p>
              <p className="text-[11px] text-fuchsia-400">Maintenance Target</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave}>
        <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Biometrics & Goals</CardTitle>
            <CardDescription className="text-xs">
              Updating your metrics recalculates your BMR, TDEE, and informs AI plan generators.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Non-editable personal info */}
            {profile && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 text-xs">
                <div>
                  <span className="text-muted-foreground flex items-center gap-1 mb-1">
                    <UserIcon className="size-3.5" /> Gender
                  </span>
                  <span className="font-semibold text-foreground capitalize">{profile.gender}</span>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1 mb-1">
                    <Calendar className="size-3.5" /> Date of Birth
                  </span>
                  <span className="font-semibold text-foreground">{formatDob(profile.dob)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Dynamic Age</span>
                  <span className="font-semibold text-foreground">{profile.age || metrics?.age || "—"} years</span>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1 mb-1">
                    <ShieldCheck className="size-3.5 text-emerald-400" /> Member Status
                  </span>
                  <span className="font-semibold text-emerald-400">Active</span>
                </div>
              </div>
            )}

            {/* Editable metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min={50}
                  max={250}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min={20}
                  max={300}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="bg-background/50"
                  required
                />
              </div>
            </div>

            {/* Fitness Goal */}
            <div className="space-y-2">
              <Label>Primary Fitness Goal</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.values(UserGoalEnum) as string[]).map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setFitnessGoal(goal)}
                    className={`p-2.5 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer ${
                      fitnessGoal === goal
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold ring-2 ring-indigo-500/20"
                        : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {goal.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Level */}
            <div className="space-y-2">
              <Label>Activity Level</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(Object.values(UserActivityLevelEnum) as string[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActivityLevel(lvl)}
                    className={`p-2.5 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer ${
                      activityLevel === lvl
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold ring-2 ring-indigo-500/20"
                        : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {lvl.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience & Diet */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.values(ExperienceLevelEnum) as string[]).map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setExperienceLevel(exp)}
                      className={`p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer ${
                        experienceLevel === exp
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dietary Preference</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {(Object.values(UserDietaryPreferenceEnum) as string[]).map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setDietaryPreference(diet)}
                      className={`p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer ${
                        dietaryPreference === diet
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {diet.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Equipment Selection */}
            <div className="space-y-2">
              <Label>Available Equipment</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {(Object.values(EquipmentEnum) as string[]).map((eq) => {
                  const isSelected = equipmentAvailable.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleEquipment(eq)}
                      className={`p-2.5 rounded-xl text-center border text-xs capitalize transition-all cursor-pointer ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-semibold ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
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
                className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Profile Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Security & Password Card */}
      <Card className="border-border/60 bg-card/75 backdrop-blur-md shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-5 text-indigo-400" />
            <CardTitle className="text-lg font-bold">Security & Password</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Update your account password to keep your fitness profile secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="change-password-form" onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="oldPassword">Current Password</Label>
                <Input
                  id="oldPassword"
                  type="password"
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/50"
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
                className="border-indigo-500/30 hover:bg-indigo-500/10 text-foreground cursor-pointer"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="size-4 mr-2 text-indigo-400" />
                    Update Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
