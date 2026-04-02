"use client";

import { useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import { carPartCategoriesQuery } from "@/lib/sanity/queries";

export type CarPartCategory = {
  id: string;
  title: string;
  slug: string;
  sourceKey?: string;
  order: number;
};

type SanityCarPartCategory = {
  _id: string;
  title: string;
  slug: string | null;
  sourceKey?: string;
  order?: number;
};

export function useCarPartCategories() {
  const [categories, setCategories] = useState<CarPartCategory[]>([
    { id: "all", title: "All", slug: "all", order: -1 },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      if (!client) {
        setIsLoading(false);
        return;
      }
      try {
        const data =
          await client.fetch<SanityCarPartCategory[]>(carPartCategoriesQuery);
        if (cancelled) return;
        const mapped: CarPartCategory[] = [
          { id: "all", title: "All", slug: "all", order: -1 },
          ...data.map((c) => ({
            id: c._id,
            title: c.title,
            slug: c.slug ?? c._id,
            ...(c.sourceKey != null && { sourceKey: c.sourceKey }),
            order: c.order ?? 0,
          })),
        ].sort((a, b) => (a.order === -1 ? -1 : a.order) - (b.order === -1 ? -1 : b.order));
        setCategories(mapped);
      } catch {
        // Keep default All-only list
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

