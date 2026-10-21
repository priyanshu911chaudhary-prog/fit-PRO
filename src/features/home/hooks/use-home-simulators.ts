"use client";

import { useState, useMemo } from "react";
import {
  computeBmi,
  computeBmiCategory,
  computeBmr,
  computeTdee,
} from "../lib/calculations";
import { AI_PROMPTS } from "../lib/constants";

export function useHomeSimulators() {
  // Interactive biometrics state
  const [calcWeight, setCalcWeight] = useState(74);
  const [calcHeight, setCalcHeight] = useState(178);

  const computedBmi = useMemo(
    () => computeBmi(calcWeight, calcHeight),
    [calcWeight, calcHeight]
  );
  const computedCategory = useMemo(
    () => computeBmiCategory(computedBmi),
    [computedBmi]
  );
  const estimatedBmr = useMemo(
    () => computeBmr(calcWeight, calcHeight),
    [calcWeight, calcHeight]
  );
  const estimatedTdee = useMemo(
    () => computeTdee(estimatedBmr),
    [estimatedBmr]
  );

  // Interactive Hydration state
  const [waterMl, setWaterMl] = useState(2250);
  const waterTarget = 3000;
  const addWater = () => {
    setWaterMl((prev) => Math.min(prev + 250, 4000));
  };

  // Interactive Workout Quick-Log state
  const [completedSets, setCompletedSets] = useState<number[]>([1, 2]);
  const toggleSet = (setNumber: number) => {
    setCompletedSets((prev) =>
      prev.includes(setNumber)
        ? prev.filter((s) => s !== setNumber)
        : [...prev, setNumber]
    );
  };

  // Interactive AI prompt simulator
  const [activePromptIndex, setActivePromptIndex] = useState(0);

  return {
    calcWeight,
    setCalcWeight,
    calcHeight,
    setCalcHeight,
    computedBmi,
    computedCategory,
    estimatedBmr,
    estimatedTdee,
    waterMl,
    waterTarget,
    addWater,
    completedSets,
    toggleSet,
    activePromptIndex,
    setActivePromptIndex,
    aiPrompts: AI_PROMPTS,
  };
}
