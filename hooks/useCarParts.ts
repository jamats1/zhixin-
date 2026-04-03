"use client";

import { useCallback, useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import { resolveCarPartPriceRange } from "@/lib/sanity/car-part-price";
import {
  carPartsByFiltersQuery,
  carPartsCountQuery,
} from "@/lib/sanity/queries";
import { useCarPartsStore } from "@/stores/carPartsStore";
import { useFilterStore } from "@/stores/filterStore";
import type { CarPart } from "@/types";

type SanityCarPart = {
  _id: string;
  name: string;
  partNumber?: string;
  category?: { _id: string; title?: string; slug?: string } | null;
  brand?: { _id: string; title?: string; slug?: string } | null;
  gallery?: Array<{
    image?: {
      asset?: {
        url: string;
      };
    };
    alt?: string;
  }>;
  priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  priceZar?: number;
  exchangeRateZarUsd?: number;
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
    selectedSparePartLineId,
    onlyOnSale,
    selectedCarPartCategory,
    searchQuery,
  } = useFilterStore();
  const [error, setError] = useState<string | null>(null);

  const fetchCarParts = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;

        const filters: {
          brandId?: string;
          categoryId?: string;
          sparePartLineId?: string;
          onSaleFilter?: boolean;
          inStockFilter?: boolean;
          searchPattern?: string;
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
          filters.brandId = selectedBrand;
          params.brandId = selectedBrand;
        }
        if (selectedSparePartLineId) {
          filters.sparePartLineId = selectedSparePartLineId;
          params.sparePartLineId = selectedSparePartLineId;
        }
        if (selectedCarPartCategory) {
          filters.categoryId = selectedCarPartCategory;
          params.categoryId = selectedCarPartCategory;
        }
        if (onlyOnSale) {
          filters.onSaleFilter = true;
        }
        const trimmedSearch = (searchQuery || "").trim();
        if (trimmedSearch) {
          filters.searchPattern = `*${trimmedSearch}*`;
          params.searchPattern = filters.searchPattern;
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
        const fetchedCarParts = await client.fetch<SanityCarPart[]>(
          query,
          params,
        );

        const transformedCarParts: CarPart[] = fetchedCarParts.map((p) => ({
          id: p._id,
          name: p.name,
          partNumber: p.partNumber,
          category: p.category?.title || "Uncategorized",
          brand: p.brand?.title || undefined,
          images:
            p.gallery?.map((img, idx) => ({
              id: `${p._id}-img-${idx}`,
              url: img.image?.asset?.url || "",
              alt: img.alt || p.name,
              type: "exterior" as const,
            })) || [],
          priceRange: resolveCarPartPriceRange({
            priceRange: p.priceRange,
            priceZar: p.priceZar,
            exchangeRateZarUsd: p.exchangeRateZarUsd,
          }),
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
          brandId: filters.brandId,
          categoryId: filters.categoryId,
          sparePartLineId: filters.sparePartLineId,
          onSaleFilter: filters.onSaleFilter,
          inStockFilter: filters.inStockFilter,
          searchPattern: filters.searchPattern,
        });
        const total = await client.fetch<number>(countQuery, params);
        setTotalCount(total);
        setHasMore(end < total);
        setCurrentPage(page);
      } catch (err) {
        console.error("Error fetching car parts:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch car parts",
        );
        if (!append) {
          setCarParts([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      selectedSparePartLineId,
      onlyOnSale,
      selectedCarPartCategory,
      selectedBrand,
      searchQuery,
      setCarParts,
      appendCarParts,
      setLoading,
      setTotalCount,
      setHasMore,
      setCurrentPage,
    ],
  );

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
