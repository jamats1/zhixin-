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
};

const FALLBACK_CATEGORIES: VehicleCategory[] = [
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

export function useVehicleCategories() {
  const [categories, setCategories] = useState<VehicleCategory[]>(FALLBACK_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      if (!client) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await client.fetch<SanityVehicleCategory[]>(vehicleCategoriesQuery);
        if (cancelled) return;
        const mapped: VehicleCategory[] = [
          { id: "all", title: "All", slug: "all", order: -1 },
          ...data.map((c) => ({
            id: c._id,
            title: c.title,
            slug: c.slug ?? c._id,
            ...(c.description != null && { description: c.description }),
            order: c.order ?? 0,
          })),
        ].sort((a, b) => (a.order === -1 ? -1 : a.order) - (b.order === -1 ? -1 : b.order));
        setCategories(mapped);
      } catch {
        if (!cancelled) setCategories(FALLBACK_CATEGORIES);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, isLoading };
}
