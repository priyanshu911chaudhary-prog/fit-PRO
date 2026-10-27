"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useProfile } from "../hooks/use-profile";
import { useChangePassword } from "../hooks/use-change-password";
import { ProfileHeader } from "./profile-header";
import { ProfileTelemetryStrip } from "./profile-telemetry-strip";
import { ProfileBiometricsForm } from "./profile-biometrics-form";
import { ProfileSecurityCard } from "./profile-security-card";
import { ProfileNotificationSettingsCard } from "./profile-notification-settings-card";

export function ProfilePageContent() {
  const {
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
  } = useProfile();

  const {
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isChangingPassword,
    handleChangePassword,
  } = useChangePassword();

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
      <ProfileHeader />

      {/* 2. Derived Telemetry Strip */}
      <ProfileTelemetryStrip metrics={metrics} />

      {/* 3. Main Settings Form */}
      <ProfileBiometricsForm
        profile={profile}
        metrics={metrics}
        height={height}
        setHeight={setHeight}
        weight={weight}
        setWeight={setWeight}
        fitnessGoal={fitnessGoal}
        setFitnessGoal={setFitnessGoal}
        activityLevel={activityLevel}
        setActivityLevel={setActivityLevel}
        experienceLevel={experienceLevel}
        setExperienceLevel={setExperienceLevel}
        dietaryPreference={dietaryPreference}
        setDietaryPreference={setDietaryPreference}
        equipmentAvailable={equipmentAvailable}
        toggleEquipment={toggleEquipment}
        isSaving={isSaving}
        onSave={handleSave}
      />

      {/* 4. Security & Credentials Vault */}
      <ProfileSecurityCard
        isOAuthUser={isOAuthUser}
        effectiveAuthProvider={effectiveAuthProvider}
        oldPassword={oldPassword}
        setOldPassword={setOldPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        isChangingPassword={isChangingPassword}
        onChangePassword={handleChangePassword}
      />

      {/* 5. Smart Fitness Nudges & Reminders */}
      <ProfileNotificationSettingsCard />
    </div>
  );
}
