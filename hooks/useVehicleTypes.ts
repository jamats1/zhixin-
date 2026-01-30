"use client";

import { useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import { vehicleTypesQuery } from "@/lib/sanity/queries";
import type { VehicleType } from "@/types";

type SanityVehicleType = {
  _id: string;
  title: string;
  slug: string | null;
  category?: { _id: string; title: string; slug: string | null };
  description?: string;
  order?: number;
};

const FALLBACK_TYPES: VehicleType[] = [
  { id: "all", title: "All", slug: "all", categoryId: "", order: -1 },
  { id: "on-sale", title: "On Sale", slug: "on-sale", categoryId: "", order: 0 },
  { id: "new-energy", title: "New Energy", slug: "new-energy", categoryId: "", order: 1 },
  { id: "gas", title: "Gas", slug: "gas", categoryId: "", order: 2 },
  { id: "diesel", title: "Diesel", slug: "diesel", categoryId: "", order: 3 },
  { id: "electric", title: "Electric", slug: "electric", categoryId: "", order: 4 },
  { id: "phev", title: "PHEV", slug: "phev", categoryId: "", order: 5 },
  { id: "hybrid", title: "Hybrid", slug: "hybrid", categoryId: "", order: 6 },
  { id: "hydrogen", title: "Hydrogen", slug: "hydrogen", categoryId: "", order: 7 },
];

export function useVehicleTypes() {
  const [types, setTypes] = useState<VehicleType[]>(FALLBACK_TYPES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTypes() {
      if (!client) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await client.fetch<SanityVehicleType[]>(vehicleTypesQuery);
        if (cancelled) return;
        const mapped: VehicleType[] = [
          { id: "all", title: "All", slug: "all", categoryId: "", order: -1 },
          ...data.map((t) => ({
            id: t._id,
            title: t.title,
            slug: t.slug ?? t._id,
            categoryId: t.category?._id ?? "",
            description: t.description,
            order: t.order ?? 0,
          })),
        ].sort((a, b) => (a.order === -1 ? -1 : a.order) - (b.order === -1 ? -1 : b.order));
        setTypes(mapped.length > 1 ? mapped : FALLBACK_TYPES);
      } catch {
        if (!cancelled) setTypes(FALLBACK_TYPES);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchTypes();
    return () => {
      cancelled = true;
    };
  }, []);

  return { types, isLoading };
}
