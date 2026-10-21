"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserDietaryPreferenceEnum,
  EquipmentEnum,
  ExperienceLevelEnum,
} from "@/constants";
import { ProfileData, ProfileMetrics } from "../types";

export function useProfile() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [metrics, setMetrics] = useState<ProfileMetrics | null>(null);
  const [authProvider, setAuthProvider] = useState<string>("local");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveAuthProvider = user?.authProvider || authProvider || "local";
  const isOAuthUser =
    effectiveAuthProvider === "google" || effectiveAuthProvider === "microsoft";

  // Editable Form fields
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(70);
  const [fitnessGoal, setFitnessGoal] = useState<string>(
    UserGoalEnum.MUSCLE_BUILDING
  );
  const [activityLevel, setActivityLevel] = useState<string>(
    UserActivityLevelEnum.MODERATELY_ACTIVE
  );
  const [dietaryPreference, setDietaryPreference] = useState<string>(
    UserDietaryPreferenceEnum.NONE
  );
  const [experienceLevel, setExperienceLevel] = useState<string>(
    ExperienceLevelEnum.INTERMEDIATE
  );
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([
    EquipmentEnum.DUMBBELL,
  ]);

  useEffect(() => {
    let isMounted = true;
    apiClient<{
      profile: ProfileData;
      metrics?: ProfileMetrics;
      isProfileComplete?: boolean;
      authProvider?: string;
    }>("/api/profile")
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await apiClient<{ profile: ProfileData; metrics?: ProfileMetrics }>(
        "/api/profile",
        {
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
        }
      );

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

  return {
    profile,
    metrics,
    effectiveAuthProvider,
    isOAuthUser,
    isLoading,
    isSaving,
    height,
    setHeight,
    weight,
    setWeight,
    fitnessGoal,
    setFitnessGoal,
    activityLevel,
    setActivityLevel,
    dietaryPreference,
    setDietaryPreference,
    experienceLevel,
    setExperienceLevel,
    equipmentAvailable,
    toggleEquipment,
    handleSave,
  };
}
