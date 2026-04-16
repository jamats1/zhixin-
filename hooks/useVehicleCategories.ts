"use client";

import { useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import { vehicleCategoriesQuery } from "@/lib/sanity/queries";
import type { VehicleCategory } from "@/types";

type SanityVehicleCategory = {
  _id: string;
  title: string;
  slug: string | null;
  icon?: { asset?: { _ref?: string }; [k: string]: unknown };
  description?: string;
  order?: number;
  appliesToSegments?: Array<"car" | "truck">;
};

/** Offline / error fallback when browsing passenger vehicles (car segment). */
const CAR_FALLBACK_CATEGORIES: VehicleCategory[] = [
  { id: "all", title: "All", slug: "all", order: -1 },
  { id: "cars", title: "Cars", slug: "cars", order: 0 },
  { id: "suvs", title: "SUVs", slug: "suvs", order: 1 },
  { id: "mpvs", title: "MPVs", slug: "mpvs", order: 2 },
  { id: "sports", title: "Sports", slug: "sports", order: 3 },
  { id: "minivan", title: "Minivan", slug: "minivan", order: 4 },
  { id: "minitruck", title: "Truck", slug: "minitruck", order: 5 },
  { id: "light", title: "Passenger", slug: "light", order: 6 },
  { id: "pickup", title: "Pickup", slug: "pickup", order: 7 },
];

/** Offline / error fallback for truck tab — avoids showing sedan/SUV chips. */
const TRUCK_FALLBACK_CATEGORIES: VehicleCategory[] = [
  { id: "all", title: "All", slug: "all", order: -1 },
  { id: "minitruck", title: "Truck", slug: "minitruck", order: 0 },
  { id: "pickup", title: "Pickup", slug: "pickup", order: 1 },
  { id: "light", title: "Commercial", slug: "light", order: 2 },
];

function segmentFallback(segment?: "car" | "truck") {
  if (segment === "truck") return TRUCK_FALLBACK_CATEGORIES;
  return CAR_FALLBACK_CATEGORIES;
}

/** Which Sanity categories belong on this tab (see `vehicleCategory.appliesToSegments`). */
function categoriesForSegment(
  data: SanityVehicleCategory[],
  segment: "car" | "truck" | undefined,
): SanityVehicleCategory[] {
  if (segment == null) return data;
  return data.filter((c) => {
    const applies = c.appliesToSegments ?? [];
    if (segment === "truck") {
      return applies.includes("truck");
    }
    // Car tab: unset segments = legacy passenger-vehicle categories (not truck-only rows).
    return applies.length === 0 || applies.includes("car");
  });
}

export function useVehicleCategories(segment?: "car" | "truck") {
  const [categories, setCategories] = useState<VehicleCategory[]>(() =>
    segmentFallback(segment),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      setIsLoading(true);
      setCategories(segmentFallback(segment));

      if (!client) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await client.fetch<SanityVehicleCategory[]>(
          vehicleCategoriesQuery,
        );
        if (cancelled) return;
        const filtered = categoriesForSegment(data, segment);
        const mapped: VehicleCategory[] = [
          { id: "all", title: "All", slug: "all", order: -1 },
          ...filtered.map((c) => ({
            id: c._id,
            title: c.title,
            slug: c.slug ?? c._id,
            ...(c.description != null && { description: c.description }),
            order: c.order ?? 0,
          })),
        ].sort(
          (a, b) =>
            (a.order === -1 ? -1 : a.order) - (b.order === -1 ? -1 : b.order),
        );
        setCategories(mapped);
      } catch {
        if (!cancelled) setCategories(segmentFallback(segment));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, [segment]);

  return { categories, isLoading };
}
