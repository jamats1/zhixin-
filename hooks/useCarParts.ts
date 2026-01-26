"use client";

import { useCallback, useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import {
  carPartsByFiltersQuery,
  carPartsCountQuery,
} from "@/lib/sanity/queries";
import { useFilterStore } from "@/stores/filterStore";
import { useCarPartsStore } from "@/stores/carPartsStore";
import type { CarPart } from "@/types";

type SanityCarPart = {
  _id: string;
  name: string;
  partNumber?: string;
  category: string;
  brand?: string;
  gallery?: Array<{
    image?: {
      asset?: {
        url: string;
      };
    };
    alt?: string;
  }>;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  specifications?: {
    material?: string;
    dimensions?: string;
    weight?: number;
    warranty?: number;
  };
  description?: string;
  isOnSale?: boolean;
  inStock?: boolean;
  slug?: {
    current: string;
  };
  publishedAt?: string;
};

const ITEMS_PER_PAGE = 20;

export function useCarParts() {
  const {
    carParts,
    isLoading,
    setCarParts,
    appendCarParts,
    setLoading,
    setTotalCount,
    setHasMore,
    setCurrentPage,
  } = useCarPartsStore();
  const {
    selectedBrand,
    onlyOnSale,
    selectedCarPartCategory,
  } = useFilterStore();
  const [error, setError] = useState<string | null>(null);

  const fetchCarParts = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const start = (page - 1) * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;

      const filters: {
        brandFilter?: string;
        categoryFilter?: string;
        onSaleFilter?: boolean;
        inStockFilter?: boolean;
        start: number;
        end: number;
      } = {
        start,
        end,
      };

      const params: Record<string, unknown> = {
        start,
        end,
      };

      if (selectedBrand) {
        filters.brandFilter = `*${selectedBrand}*`;
        params.brandFilter = filters.brandFilter;
      }
      if (selectedCarPartCategory && selectedCarPartCategory !== "all") {
        filters.categoryFilter = selectedCarPartCategory;
        params.categoryFilter = selectedCarPartCategory;
      }
      if (onlyOnSale) {
        filters.onSaleFilter = true;
      }
      // Always filter for in-stock items
      filters.inStockFilter = true;

      if (!client) {
        setCarParts([]);
        setTotalCount(0);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const query = carPartsByFiltersQuery(filters);
      const fetchedCarParts = await client.fetch<SanityCarPart[]>(query, params);

      const transformedCarParts: CarPart[] = fetchedCarParts.map((p) => ({
        id: p._id,
        name: p.name,
        partNumber: p.partNumber,
        category: p.category,
        brand: p.brand,
        images:
          p.gallery?.map((img, idx) => ({
            id: `${p._id}-img-${idx}`,
            url: img.image?.asset?.url || "",
            alt: img.alt || p.name,
            type: "exterior" as const,
          })) || [],
        priceRange: p.priceRange
          ? {
              min: p.priceRange.min,
              max: p.priceRange.max,
              currency: p.priceRange.currency || "USD",
            }
          : undefined,
        specifications: p.specifications,
        description: p.description,
        isOnSale: p.isOnSale || false,
        inStock: p.inStock ?? true,
        slug: p.slug?.current,
        publishedAt: p.publishedAt,
      }));

      if (append) {
        appendCarParts(transformedCarParts);
      } else {
        setCarParts(transformedCarParts);
      }

      const countQuery = carPartsCountQuery({
        brandFilter: filters.brandFilter,
        categoryFilter: filters.categoryFilter,
        onSaleFilter: filters.onSaleFilter,
        inStockFilter: filters.inStockFilter,
      });
      const total = await client.fetch<number>(countQuery, params);
      setTotalCount(total);
      setHasMore(end < total);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching car parts:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch car parts");
      if (!append) {
        setCarParts([]);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBrand, onlyOnSale, selectedCarPartCategory, setCarParts, appendCarParts, setLoading, setTotalCount, setHasMore, setCurrentPage]);

  const loadMore = useCallback(() => {
    const state = useCarPartsStore.getState();
    if (!state.isLoading && state.hasMore) {
      fetchCarParts(state.currentPage + 1, true);
    }
  }, [fetchCarParts]);

  useEffect(() => {
    fetchCarParts(1, false);
  }, [fetchCarParts]);

  return {
    carParts,
    isLoading,
    hasMore: useCarPartsStore.getState().hasMore,
    loadMore,
    error,
    refetch: () => fetchCarParts(1, false),
  };
}
