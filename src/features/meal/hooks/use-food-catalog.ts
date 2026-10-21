"use client";

import { useEffect, useState, useMemo } from "react";
import { apiClient } from "@/lib/api-client";
import { FoodItem, CategoryFilterId } from "../types";
import { filterFoodCatalog } from "../lib/calculations";

export function useFoodCatalog() {
  const [foodsCatalog, setFoodsCatalog] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterId>("all");

  useEffect(() => {
    let isMounted = true;
    apiClient<{ foods: FoodItem[] }>("/api/foods?limit=50")
      .then((res) => {
        if (isMounted && res.data?.foods) {
          setFoodsCatalog(res.data.foods);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    return filterFoodCatalog(foodsCatalog, searchQuery, categoryFilter);
  }, [foodsCatalog, searchQuery, categoryFilter]);

  return {
    foodsCatalog,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    filteredCatalog,
  };
}
