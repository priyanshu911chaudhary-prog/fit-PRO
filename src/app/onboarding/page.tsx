"use client";

import React, { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dumbbell,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Activity,
  Flame,
  Scale,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { calculateBMI, calculateBMR, calculateTDEE, calculateAge } from "@/lib/fitness-calc";
import {
  UserGoalEnum,
  UserActivityLevelEnum,
  UserDietaryPreferenceEnum,
  EquipmentEnum,
  ExperienceLevelEnum,
  UserGenderEnum,
} from "@/constants";

function OnboardingForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [gender, setGender] = useState<string>("male");
  const [dob, setDob] = useState<string>("1998-05-15");
  const [height, setHeight] = useState<number>(175);
  const [weight, setWeight] = useState<number>(75);
  const [fitnessGoal, setFitnessGoal] = useState<string>("general_fitness");
  const [activityLevel, setActivityLevel] = useState<string>("moderately_active");
  const [dietaryPreference, setDietaryPreference] = useState<string>("none");
  const [experienceLevel, setExperienceLevel] = useState<string>("intermediate");
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([EquipmentEnum.DUMBBELL, EquipmentEnum.BODYWEIGHT]);

  const toggleEquipment = (eq: string) => {
    if (equipmentAvailable.includes(eq)) {
      if (equipmentAvailable.length > 1) {
        setEquipmentAvailable(equipmentAvailable.filter((e) => e !== eq));
      }
    } else {
      setEquipmentAvailable([...equipmentAvailable, eq]);
    }
  };

  // Preview computations
  const age = calculateAge(dob);
  const bmiInfo = calculateBMI(weight, height);
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel as "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "super_active");

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
        toast.success("Profile created! Day-1 metrics recorded.");
        await refreshUser();
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { message?: string } })?.response?.message ||
        (err as Error).message ||
        "Failed to save profile.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-2xl border-border/60 bg-card/75 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 shadow-md">
                <Dumbbell className="size-4 text-white" />
              </div>
              <span className="font-heading font-bold text-foreground">AI Fitness Onboarding</span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400">
              Step {step} of 4
            </span>
          </div>

          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>

          <CardTitle className="text-xl font-bold tracking-tight pt-2">
            {step === 1 && "Personal Biometrics"}
            {step === 2 && "Fitness Goals & Activity"}
            {step === 3 && "Equipment & Experience"}
            {step === 4 && "Confirm Your Baseline"}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {step === 1 && "Accurate measurements ensure precise caloric and macronutrient recommendations."}
            {step === 2 && "Define what you want to achieve and your typical daily movement."}
            {step === 3 && "Help Gemini AI tailor exercises to the gear and experience level you have."}
            {step === 4 && "Review your baseline metrics before initializing your personalized program."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* STEP 1: Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.values(UserGenderEnum) as string[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        gender === g
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="bg-background/50"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Calculated Age: {age} years</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
            </div>
          )}

          {/* STEP 2: Goal & Activity */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Fitness Goal</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.values(UserGoalEnum) as string[]).map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setFitnessGoal(goal)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        fitnessGoal === goal
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <p className="text-xs font-bold capitalize">{goal.replace(/_/g, " ")}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Daily Activity Level</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.values(UserActivityLevelEnum) as string[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setActivityLevel(lvl)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        activityLevel === lvl
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <p className="text-xs font-semibold capitalize">{lvl.replace(/_/g, " ")}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Equipment & Experience */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Experience Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.values(ExperienceLevelEnum) as string[]).map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      onClick={() => setExperienceLevel(exp)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        experienceLevel === exp
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Dietary Preference</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.values(UserDietaryPreferenceEnum) as string[]).map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() => setDietaryPreference(diet)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        dietaryPreference === diet
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/20"
                          : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {diet.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Available Equipment (Select all that apply)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.values(EquipmentEnum) as string[]).map((eq) => {
                    const isSelected = equipmentAvailable.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => toggleEquipment(eq)}
                        className={`p-2 rounded-lg text-left border text-xs capitalize transition-all ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 font-semibold"
                            : "border-border bg-background/50 hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {eq.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Baseline Preview */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-1">
                  <div className="flex justify-center text-indigo-400">
                    <Scale className="size-5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">Initial BMI</p>
                  <p className="text-xl font-extrabold text-foreground">{bmiInfo.bmi}</p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 capitalize">
                    {bmiInfo.category}
                  </span>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
                  <div className="flex justify-center text-emerald-400">
                    <Flame className="size-5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">BMR Baseline</p>
                  <p className="text-xl font-extrabold text-foreground">{bmr}</p>
                  <span className="text-[10px] text-muted-foreground">kcal / day</span>
                </div>

                <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-3.5 space-y-1">
                  <div className="flex justify-center text-fuchsia-400">
                    <Activity className="size-5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">TDEE Target</p>
                  <p className="text-xl font-extrabold text-foreground">{tdee}</p>
                  <span className="text-[10px] text-muted-foreground">kcal / day</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age / Gender:</span>
                  <span className="font-semibold text-foreground capitalize">{age} yrs, {gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Height & Weight:</span>
                  <span className="font-semibold text-foreground">{height} cm, {weight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Goal:</span>
                  <span className="font-semibold text-foreground capitalize">{fitnessGoal.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experience:</span>
                  <span className="font-semibold text-foreground capitalize">{experienceLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equipment:</span>
                  <span className="font-semibold text-foreground capitalize truncate max-w-[200px]">
                    {equipmentAvailable.join(", ").replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400">
                <Sparkles className="size-4 shrink-0" />
                <span>Creating your profile will automatically seed your Day-1 baseline metrics for tracking!</span>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border/40 pt-4">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              <ArrowLeft className="size-4 mr-1" />
              Previous
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              onClick={() => setStep(step + 1)}
            >
              Continue
              <ArrowRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white font-medium shadow-md shadow-indigo-500/20"
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  Confirm & Launch Dashboard
                  <CheckCircle2 className="size-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-4"><div className="w-full max-w-2xl h-96 rounded-2xl bg-card/50 animate-pulse" /></div>}>
      <OnboardingForm />
    </Suspense>
  );
}
