"use client";

import { useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import { brandsQuery } from "@/lib/sanity/queries";
import type { BrandWithLogo } from "@/types";

type SanityBrand = {
  _id: string;
  title: string;
  slug: string | null;
  logo?: { asset?: { _ref?: string; url?: string }; [k: string]: unknown };
  count: number;
  isHot?: boolean;
};

const MOCK_BRANDS: BrandWithLogo[] = [
  { id: "mock-1", name: "Abarth", count: 888 },
  { id: "mock-2", name: "AC Cars", count: 22 },
  { id: "mock-3", name: "Acura", count: 15234 },
  { id: "mock-4", name: "Alfa Romeo", count: 5678 },
  { id: "mock-5", name: "Aston Martin", count: 2345 },
  { id: "mock-6", name: "Audi", count: 45678 },
  { id: "mock-7", name: "BMW", count: 67890 },
  { id: "mock-8", name: "BYD", count: 34567 },
  { id: "mock-9", name: "Ford", count: 45678 },
  { id: "mock-10", name: "Honda", count: 34567 },
  { id: "mock-11", name: "Hyundai", count: 23456 },
  { id: "mock-12", name: "Mercedes-Benz", count: 67890 },
  { id: "mock-13", name: "Nissan", count: 45678 },
  { id: "mock-14", name: "Porsche", count: 12345 },
  { id: "mock-15", name: "Tesla", count: 34567 },
  { id: "mock-16", name: "Toyota", count: 67890 },
  { id: "mock-17", name: "Volkswagen", count: 45678 },
  { id: "mock-18", name: "Volvo", count: 12345 },
];

export function useBrands() {
  const [brands, setBrands] = useState<BrandWithLogo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchBrands() {
      if (!client) {
        setBrands(MOCK_BRANDS);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await client.fetch<SanityBrand[]>(brandsQuery);
        if (cancelled) return;
        const mapped: BrandWithLogo[] = data.map((b) => ({
          id: b._id,
          name: b.title,
          count: b.count,
          logo: b.logo,
          isHot: b.isHot ?? false,
        }));
        setBrands(mapped);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to fetch brands");
          setBrands(MOCK_BRANDS);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchBrands();
    return () => {
      cancelled = true;
    };
  }, []);

  return { brands, isLoading, error };
}
