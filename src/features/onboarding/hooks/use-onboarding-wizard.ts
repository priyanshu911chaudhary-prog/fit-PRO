"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import {
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateAge,
} from "@/lib/fitness-calc";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserDietaryPreferenceEnum,
  EquipmentEnum,
  ExperienceLevelEnum,
} from "@/constants";

export function useOnboardingWizard() {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [gender, setGender] = useState<string>("male");
  const [dob, setDob] = useState<string>("1998-05-15");
  const [height, setHeight] = useState<number>(178);
  const [weight, setWeight] = useState<number>(75);
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
    EquipmentEnum.BODYWEIGHT,
  ]);

  // Real-time live biometrics calculations
  const age = calculateAge(dob);
  const bmiInfo = calculateBMI(weight, height);
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(
    bmr,
    activityLevel as
      | "sedentary"
      | "lightly_active"
      | "moderately_active"
      | "very_active"
      | "super_active"
  );

  const toggleEquipment = (eq: string) => {
    if (equipmentAvailable.includes(eq)) {
      if (equipmentAvailable.length > 1) {
        setEquipmentAvailable(equipmentAvailable.filter((e) => e !== eq));
      }
    } else {
      setEquipmentAvailable([...equipmentAvailable, eq]);
    }
  };

  const goToStep = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const res = await apiClient("/api/profile", {
        method: "POST",
        body: JSON.stringify({
          gender,
          dob,
          height: Number(height),
          weight: Number(weight),
          fitnessGoal,
          activityLevel,
          dietaryPreference,
          experienceLevel,
          equipmentAvailable,
        }),
      });

      if (res.success) {
        toast.success("Profile created! Baseline metrics calibrated.");
        await refreshUser();
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to save baseline profile.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    step,
    direction,
    isSubmitting,
    gender,
    setGender,
    dob,
    setDob,
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
    age,
    bmiInfo,
    bmr,
    tdee,
    goToStep,
    handleSubmit,
  };
}
