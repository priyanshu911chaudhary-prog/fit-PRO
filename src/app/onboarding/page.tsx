"use client";

import React, { Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale,
  Flame,
  Activity,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Loader2,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  Utensils,
  Layers,
  HeartPulse,
} from "lucide-react";
import { FitProLogo } from "@/components/brand/fit-pro-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
import { calculateBMI, calculateBMR, calculateTDEE, calculateAge } from "@/lib/fitness-calc";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserDietaryPreferenceEnum,
  EquipmentEnum,
  ExperienceLevelEnum,
  UserGenderEnum,
} from "@/constants";
import { cn } from "cn";

const GOAL_OPTIONS = [
  {
    id: UserGoalEnum.MUSCLE_BUILDING,
    title: "Muscle Building",
    desc: "Hypertrophy protocols with progressive overload volume.",
    icon: Dumbbell,
  },
  {
    id: UserGoalEnum.WEIGHT_LOSS,
    title: "Weight & Fat Loss",
    desc: "Caloric deficit designed to preserve lean muscle tissue.",
    icon: Flame,
  },
  {
    id: UserGoalEnum.STRENGTH_TRAINING,
    title: "Strength & Power",
    desc: "Neuromuscular force production with heavy compound lifts.",
    icon: Zap,
  },
  {
    id: UserGoalEnum.ENDURANCE_TRAINING,
    title: "Athletic Endurance",
    desc: "Cardiorespiratory stamina, lactate threshold, and VO2 max.",
    icon: Activity,
  },
  {
    id: UserGoalEnum.GENERAL_FITNESS,
    title: "Longevity & Health",
    desc: "Balanced metabolic conditioning, mobility, and vitality.",
    icon: HeartPulse,
  },
];

const ACTIVITY_OPTIONS = [
  { id: UserActivityLevelEnum.SEDENTARY, label: "Sedentary", detail: "Desk job, little to no exercise" },
  { id: UserActivityLevelEnum.LIGHTLY_ACTIVE, label: "Lightly Active", detail: "Light training 1–3 days/wk" },
  { id: UserActivityLevelEnum.MODERATELY_ACTIVE, label: "Moderately Active", detail: "Moderate exercise 3–5 days/wk" },
  { id: UserActivityLevelEnum.VERY_ACTIVE, label: "Very Active", detail: "Intense training 6–7 days/wk" },
  { id: UserActivityLevelEnum.SUPER_ACTIVE, label: "Super Active", detail: "Daily athletic training or physical job" },
];

const STEPS = [
  { number: 1, title: "Biometrics", short: "Body Specs" },
  { number: 2, title: "Goals", short: "Training & Activity" },
  { number: 3, title: "Equipment", short: "Gear & Diet" },
  { number: 4, title: "Calibration", short: "Review Baseline" },
];

function OnboardingContent() {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [gender, setGender] = useState<string>("male");
  const [dob, setDob] = useState<string>("1998-05-15");
  const [height, setHeight] = useState<number>(178);
  const [weight, setWeight] = useState<number>(75);
  const [fitnessGoal, setFitnessGoal] = useState<string>(UserGoalEnum.MUSCLE_BUILDING);
  const [activityLevel, setActivityLevel] = useState<string>(UserActivityLevelEnum.MODERATELY_ACTIVE);
  const [dietaryPreference, setDietaryPreference] = useState<string>(UserDietaryPreferenceEnum.NONE);
  const [experienceLevel, setExperienceLevel] = useState<string>(ExperienceLevelEnum.INTERMEDIATE);
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
    activityLevel as "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "super_active"
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

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="rounded-3xl border border-border/70 bg-card/85 dark:bg-card/75 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

        {/* Header & Step Capsule Bar */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-card border border-border/80 text-emerald-400 shadow-xs">
                <FitProLogo size={20} />
              </div>
              <div>
                <span className="font-heading text-base font-black tracking-tight text-foreground">
                  fit-PRO
                </span>
                <p className="text-[11px] text-muted-foreground font-mono">Calibration Protocol v2.0</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
              <Sparkles className="size-3" />
              <span>Step {step} of 4</span>
            </div>
          </div>

          {/* Connected Step Pills */}
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s) => {
              const isCurrent = step === s.number;
              const isCompleted = step > s.number;
              return (
                <div
                  key={s.number}
                  className={cn(
                    "flex flex-col p-2.5 rounded-2xl border transition-all select-none",
                    isCurrent
                      ? "border-emerald-500/40 bg-emerald-500/10 text-foreground shadow-xs shadow-emerald-500/10"
                      : isCompleted
                      ? "border-border/80 bg-muted/30 text-foreground"
                      : "border-border/40 bg-muted/10 text-muted-foreground/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold">0{s.number}</span>
                    <div
                      className={cn(
                        "size-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                        isCompleted
                          ? "bg-emerald-500 text-black"
                          : isCurrent
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : "bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {isCompleted ? "✓" : s.number}
                    </div>
                  </div>
                  <span className="text-xs font-bold mt-1 truncate">{s.title}</span>
                </div>
              );
            })}
          </div>

          {/* Real-Time Live Biometrics HUD (The Kinetic Ribbon) */}
          <div className="rounded-2xl border border-border/80 bg-background/70 backdrop-blur-md p-4 grid grid-cols-3 gap-3 text-center shadow-xs">
            <div className="space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Scale className="size-3 text-emerald-400" />
                <span>BMI Score</span>
              </div>
              <div className="text-xl font-black text-emerald-400">{bmiInfo.bmi}</div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 capitalize">
                {bmiInfo.category}
              </span>
            </div>

            <div className="space-y-0.5 border-x border-border/50 px-2">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Flame className="size-3 text-amber-400" />
                <span>Resting BMR</span>
              </div>
              <div className="text-xl font-black text-foreground">{bmr}</div>
              <span className="text-[10px] text-muted-foreground">kcal / day (Basal)</span>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Activity className="size-3 text-cyan-400" />
                <span>Projected TDEE</span>
              </div>
              <div className="text-xl font-black text-cyan-400">{tdee}</div>
              <span className="text-[10px] text-muted-foreground">kcal / day (Burn)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Step Panels with Directional Slide */}
        <div className="min-h-[340px]">
          <AnimatePresence custom={direction} mode="wait">
            {/* STEP 1: Personal Biometrics */}
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
                <div className="space-y-1">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Calibrate Your Physical Baseline
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Measurements directly drive your Mifflin-St Jeor metabolic calculation.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Gender Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Biological Sex</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: UserGenderEnum.MALE, label: "Male" },
                        { id: UserGenderEnum.FEMALE, label: "Female" },
                        { id: UserGenderEnum.OTHER, label: "Other" },
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGender(g.id)}
                          className={cn(
                            "py-2.5 px-3 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer",
                            gender === g.id
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-xs"
                              : "border-border/70 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DOB */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="dob" className="text-xs font-semibold">Date of Birth</Label>
                      <span className="text-xs font-mono text-emerald-400 font-semibold">{age} years old</span>
                    </div>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="bg-background/50 h-10 text-sm focus-visible:ring-emerald-500/30"
                      required
                    />
                  </div>

                  {/* Height Dual Slider + Stepper */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-baseline">
                      <Label htmlFor="height" className="text-xs font-semibold">Height</Label>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-base font-black text-foreground">{height}</span>
                        <span className="text-xs text-muted-foreground">cm</span>
                      </div>
                    </div>
                    <input
                      id="height"
                      type="range"
                      min={120}
                      max={225}
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-2 bg-muted/60 rounded-lg"
                    />
                  </div>

                  {/* Weight Dual Slider + Stepper */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-baseline">
                      <Label htmlFor="weight" className="text-xs font-semibold">Weight</Label>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-base font-black text-emerald-400">{weight}</span>
                        <span className="text-xs text-muted-foreground">kg</span>
                      </div>
                    </div>
                    <input
                      id="weight"
                      type="range"
                      min={40}
                      max={180}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-2 bg-muted/60 rounded-lg"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Goal & Activity */}
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
                <div className="space-y-1">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Target Goal & Movement Frequency
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Determines your workout routine split and daily macronutrient partition.
                  </p>
                </div>

                {/* Primary Goal Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Primary Athletic Objective</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GOAL_OPTIONS.map((g) => {
                      const isSelected = fitnessGoal === g.id;
                      const Icon = g.icon;
                      return (
                        <div
                          key={g.id}
                          onClick={() => setFitnessGoal(g.id)}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none",
                            isSelected
                              ? "border-emerald-500/50 bg-emerald-500/15 shadow-xs"
                              : "border-border/70 bg-background/50 hover:bg-muted/60"
                          )}
                        >
                          <div
                            className={cn(
                              "size-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                              isSelected
                                ? "bg-emerald-500 text-black shadow-xs"
                                : "bg-muted/60 text-muted-foreground"
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">{g.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{g.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Daily Activity Level */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold">Daily Movement Level</Label>
                  <div className="space-y-1.5">
                    {ACTIVITY_OPTIONS.map((lvl) => {
                      const isSelected = activityLevel === lvl.id;
                      return (
                        <div
                          key={lvl.id}
                          onClick={() => setActivityLevel(lvl.id)}
                          className={cn(
                            "flex items-center justify-between p-2.5 px-3 rounded-xl border transition-all cursor-pointer select-none",
                            isSelected
                              ? "border-emerald-500/50 bg-emerald-500/15 text-foreground"
                              : "border-border/60 bg-background/40 hover:bg-muted/60 text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                "size-4 rounded-full border flex items-center justify-center",
                                isSelected ? "border-emerald-400 bg-emerald-400" : "border-border/80"
                              )}
                            >
                              {isSelected && <span className="size-1.5 rounded-full bg-black" />}
                            </div>
                            <span className="text-xs font-bold text-foreground">{lvl.label}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{lvl.detail}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Equipment & Experience */}
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
                <div className="space-y-1">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Available Gear & Dietary Preferences
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ensures every generated exercise matches what you actually have access to.
                  </p>
                </div>

                {/* Experience Level */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Lifting Experience</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: ExperienceLevelEnum.BEGINNER, label: "Beginner", sub: "< 1 year" },
                      { id: ExperienceLevelEnum.INTERMEDIATE, label: "Intermediate", sub: "1–3 years" },
                      { id: ExperienceLevelEnum.ADVANCED, label: "Advanced", sub: "3+ years" },
                    ].map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => setExperienceLevel(exp.id)}
                        className={cn(
                          "py-2.5 px-2 rounded-xl text-center border transition-all cursor-pointer",
                          experienceLevel === exp.id
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-xs"
                            : "border-border/70 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                        )}
                      >
                        <p className="text-xs font-bold">{exp.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{exp.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Gear (Multi-select) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Available Equipment (Multi-Select)</Label>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      {equipmentAvailable.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(Object.values(EquipmentEnum) as string[]).map((eq) => {
                      const isSelected = equipmentAvailable.includes(eq);
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => toggleEquipment(eq)}
                          className={cn(
                            "p-2.5 rounded-xl text-left border text-xs capitalize transition-all cursor-pointer flex items-center justify-between",
                            isSelected
                              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 font-bold"
                              : "border-border/60 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                          )}
                        >
                          <span className="truncate">{eq.replace(/_/g, " ")}</span>
                          {isSelected && <Check className="size-3.5 text-emerald-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dietary Preference */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold">Dietary Protocol</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.values(UserDietaryPreferenceEnum) as string[]).map((diet) => (
                      <button
                        key={diet}
                        type="button"
                        onClick={() => setDietaryPreference(diet)}
                        className={cn(
                          "py-2 px-2.5 rounded-xl text-xs font-semibold capitalize border transition-all cursor-pointer",
                          dietaryPreference === diet
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                            : "border-border/60 bg-background/50 hover:bg-muted/70 text-muted-foreground"
                        )}
                      >
                        {diet.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Calibration Confirmation */}
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
                <div className="space-y-1">
                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    Calibration Dossier
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Review your biometric metrics before initializing your 3-day split program.
                  </p>
                </div>

                {/* Athlete Dossier Grid */}
                <div className="rounded-2xl border border-border/80 bg-background/60 p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Athlete Baseline:</span>
                    <span className="font-bold text-foreground capitalize">
                      {age} yrs • {gender} • {height} cm • {weight} kg
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Target Objective:</span>
                    <span className="font-bold text-emerald-400 capitalize">
                      {fitnessGoal.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Daily Movement:</span>
                    <span className="font-bold text-foreground capitalize">
                      {activityLevel.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Nutrition Preference:</span>
                    <span className="font-bold text-cyan-400 capitalize">
                      {dietaryPreference.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Gear Catalog:</span>
                    <span className="font-bold text-foreground capitalize text-right max-w-[240px]">
                      {equipmentAvailable.join(", ").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Macro Target Projection Banner */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 text-xs text-emerald-400">
                  <Sparkles className="size-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-foreground">Automatic Day-1 Seeding Enabled</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Launching will initialize your 3-day workout split, set your daily {tdee} kcal target, and calibrate your progressive overload tracking.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToStep(step - 1)}
              disabled={isSubmitting}
              className="border-border/80 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="size-3.5 mr-1.5" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => goToStep(step + 1)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold h-9 px-5 shadow-sm shadow-emerald-500/20 cursor-pointer"
            >
              Continue
              <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-black h-10 px-6 shadow-md shadow-emerald-500/30 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Calibrating Protocol...
                </>
              ) : (
                <>
                  Launch Athlete Dashboard
                  <CheckCircle2 className="size-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background relative overflow-hidden">
      <Suspense
        fallback={
          <div className="w-full max-w-3xl h-[620px] rounded-3xl bg-card/40 border border-border/40 animate-pulse mx-auto" />
        }
      >
        <OnboardingContent />
      </Suspense>
    </div>
  );
}
