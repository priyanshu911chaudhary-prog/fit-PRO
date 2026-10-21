"use client";

import { useEffect, useState, useTransition } from "react";
import { apiClient } from "@/lib/api-client";
import { FoodItem, CategoryFilterId } from "../types";

export function useFoodCatalog() {
  const [foodsCatalog, setFoodsCatalog] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterId>("all");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [, startTransition] = useTransition();

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        setDebouncedQuery(searchQuery);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch foods from server based on debounced query and category
  useEffect(() => {
    let isMounted = true;

    const params = new URLSearchParams();
    params.set("limit", "60");
    if (debouncedQuery.trim()) {
      params.set("q", debouncedQuery.trim());
    }
    if (categoryFilter && categoryFilter !== "all") {
      params.set("category", categoryFilter);
    }

    apiClient<{ foods: FoodItem[] }>(`/api/foods?${params.toString()}`)
      .then((res) => {
        if (isMounted && res.data?.foods) {
          setFoodsCatalog(res.data.foods);
        }
      })
      .catch(() => {
        if (isMounted) setFoodsCatalog([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCatalog(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, categoryFilter]);

  return {
    foodsCatalog,
    isLoadingCatalog,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    filteredCatalog: foodsCatalog,
  };
}
