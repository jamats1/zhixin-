"use client";

import { useCallback, useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import { sparePartLinesByBrandQuery } from "@/lib/sanity/queries";

export type SparePartLineOption = {
  id: string;
  title: string;
  slug: string | null;
  path: string | null;
};

export function useSparePartLines(brandId: string | null) {
  const [lines, setLines] = useState<SparePartLineOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLines = useCallback(async (id: string | null) => {
    if (!client || !id) {
      setLines([]);
      return;
    }
    setIsLoading(true);
    try {
      const rows = await client.fetch<SparePartLineOption[]>(
        sparePartLinesByBrandQuery,
        {
          brandId: id,
        },
      );
      setLines(rows ?? []);
    } catch {
      setLines([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLines(brandId);
  }, [brandId, fetchLines]);

  return { lines, isLoading, refetch: () => fetchLines(brandId) };
}
