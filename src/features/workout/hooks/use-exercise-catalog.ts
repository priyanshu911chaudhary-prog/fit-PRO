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
    apiClient<{ exercises: ExerciseItem[] }>("/api/exercises?limit=50")
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
    return exercisesCatalog.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase());
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
