"use client";

import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import type { ExerciseItem } from "../types";

export function useExerciseCatalog() {
  const [exercisesCatalog, setExercisesCatalog] = useState<ExerciseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("");

  useEffect(() => {
    let isMounted = true;
    apiClient<{ exercises: ExerciseItem[] }>("/api/exercises?limit=500")
      .then((res) => {
        if (isMounted && res.data?.exercises) {
          setExercisesCatalog(res.data.exercises);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    const queryLower = searchQuery.toLowerCase().trim();
    return exercisesCatalog.filter((item) => {
      const matchesQuery =
        !queryLower ||
        item.name.toLowerCase().includes(queryLower) ||
        Boolean(item.aliases?.some((a) => a.toLowerCase().includes(queryLower)));
      const matchesMuscle = selectedMuscle
        ? item.targetMuscle.toLowerCase() === selectedMuscle.toLowerCase()
        : true;
      return matchesQuery && matchesMuscle;
    });
  }, [exercisesCatalog, searchQuery, selectedMuscle]);

  return {
    exercisesCatalog,
    searchQuery,
    setSearchQuery,
    selectedMuscle,
    setSelectedMuscle,
    filteredCatalog,
  };
}
