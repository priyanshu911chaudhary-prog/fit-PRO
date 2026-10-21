"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboardingWizard } from "../hooks/use-onboarding-wizard";
import { OnboardingHeader } from "./onboarding-header";
import { OnboardingTelemetryHud } from "./onboarding-telemetry-hud";
import { StepBiometrics } from "./step-biometrics";
import { StepGoals } from "./step-goals";
import { StepEquipment } from "./step-equipment";
import { StepCalibration } from "./step-calibration";
import { OnboardingFooter } from "./onboarding-footer";

const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 30 : -30,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -30 : 30,
    opacity: 0,
  }),
};

export function OnboardingPageContent() {
  const {
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
  } = useOnboardingWizard();

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="rounded-3xl border border-border/70 bg-card/85 dark:bg-card/75 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div className="space-y-6">
          <OnboardingHeader step={step} />
          <OnboardingTelemetryHud bmiInfo={bmiInfo} bmr={bmr} tdee={tdee} />
        </div>

        {/* Dynamic Step Panels with Directional Slide */}
        <div className="min-h-[340px]">
          <AnimatePresence custom={direction} mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <StepBiometrics
                  gender={gender}
                  setGender={setGender}
                  dob={dob}
                  setDob={setDob}
                  age={age}
                  height={height}
                  setHeight={setHeight}
                  weight={weight}
                  setWeight={setWeight}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <StepGoals
                  fitnessGoal={fitnessGoal}
                  setFitnessGoal={setFitnessGoal}
                  activityLevel={activityLevel}
                  setActivityLevel={setActivityLevel}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <StepEquipment
                  experienceLevel={experienceLevel}
                  setExperienceLevel={setExperienceLevel}
                  equipmentAvailable={equipmentAvailable}
                  toggleEquipment={toggleEquipment}
                  dietaryPreference={dietaryPreference}
                  setDietaryPreference={setDietaryPreference}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <StepCalibration
                  age={age}
                  gender={gender}
                  height={height}
                  weight={weight}
                  fitnessGoal={fitnessGoal}
                  activityLevel={activityLevel}
                  dietaryPreference={dietaryPreference}
                  equipmentAvailable={equipmentAvailable}
                  tdee={tdee}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <OnboardingFooter
          step={step}
          isSubmitting={isSubmitting}
          onBack={() => goToStep(step - 1)}
          onNext={() => goToStep(step + 1)}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
