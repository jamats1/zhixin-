"use client";

import { useMemo } from "react";
import { useVehicleTypes } from "@/hooks/useVehicleTypes";
import type { VehicleType } from "@/types";

/** Slugs from offline fallback types — not valid Sanity `vehicleType` document ids. */
const FALLBACK_TYPE_SLUGS = new Set([
  "on-sale",
  "new-energy",
  "gas",
  "diesel",
  "electric",
  "phev",
  "hybrid",
  "hydrogen",
]);

/**
 * Vehicle body / model-line types from Sanity, scoped by selected vehicle category.
 * Omits placeholder fuel/sale options from `useVehicleTypes` fallback data.
 */
export function useVehicleTypesForFilters(
  selectedCategory: string | null,
): {
  types: VehicleType[];
  isLoading: boolean;
  showRow: boolean;
} {
  const { types: raw, isLoading } = useVehicleTypes();

  const types = useMemo(() => {
    const cleaned = raw.filter(
      (t) => t.id === "all" || !FALLBACK_TYPE_SLUGS.has(t.slug),
    );
    if (!selectedCategory) {
      return cleaned.filter(
        (t) => t.id === "all" || !t.categoryId || t.categoryId === "",
      );
    }
    return cleaned.filter(
      (t) =>
        t.id === "all" ||
        t.categoryId === selectedCategory ||
        t.categoryId === "",
    );
  }, [raw, selectedCategory]);

  const showRow = !isLoading && types.length > 1;

  return { types, isLoading, showRow };
}
