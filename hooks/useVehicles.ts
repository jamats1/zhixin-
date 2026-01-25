import { useCallback, useEffect, useState } from "react";
import client from "@/lib/sanity/client";
import {
  vehiclesByFiltersQuery,
  vehiclesCountQuery,
} from "@/lib/sanity/queries";
import { useFilterStore } from "@/stores/filterStore";
import { useGalleryStore } from "@/stores/galleryStore";
import type { Vehicle } from "@/types";

type SanityVehicle = {
  _id: string;
  brand: string;
  model: string;
  year: number;
  type?: {
    _id: string;
    title: string;
    slug?: {
      current: string;
    };
    category?: {
      _id: string;
      title: string;
      slug?: {
        current: string;
      };
    };
  };
  gallery?: Array<{
    image?: {
      asset?: {
        url: string;
      };
    };
    alt?: string;
    imageType?: string;
  }>;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  specs?: {
    engine?: string;
    power?: number;
    transmission?: string;
    drivetrain?: string;
    fuelType?: string;
  };
  isOnSale?: boolean;
  isNewEnergy?: boolean;
  slug?: {
    current: string;
  };
  publishedAt?: string;
};

const ITEMS_PER_PAGE = 20;

export function useVehicles() {
  const {
    vehicles,
    isLoading,
    setVehicles,
    appendVehicles,
    setLoading,
    setTotalCount,
    setHasMore,
    setCurrentPage,
  } = useGalleryStore();
  const {
    selectedBrand,
    selectedType,
    onlyOnSale,
    onlyNewEnergy,
    fuelType,
  } = useFilterStore();
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;

        // Build query filters
        const filters: {
          brandFilter?: string;
          typeFilter?: string;
          onSaleFilter?: boolean;
          newEnergyFilter?: boolean;
          fuelTypeFilter?: string;
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
        if (selectedType) {
          filters.typeFilter = selectedType;
          params.typeFilter = selectedType;
        }
        if (onlyOnSale) {
          filters.onSaleFilter = true;
        }
        if (onlyNewEnergy) {
          filters.newEnergyFilter = true;
        }
        if (fuelType) {
          // Map filter values to search patterns for common fuel type variations
          const fuelTypePatterns: Record<string, string> = {
            gas: "*Gas*",
            diesel: "*Diesel*",
            electric: "*Electric*",
            phev: "*PHEV*",
            hybrid: "*Hybrid*",
            hydrogen: "*Hydrogen*",
          };
          filters.fuelTypeFilter = fuelTypePatterns[fuelType] || `*${fuelType}*`;
          params.fuelTypeFilter = filters.fuelTypeFilter;
        }

        // Check if client is configured
        if (!client) {
          // Fallback to mock data if Sanity is not configured
          const mockVehicles: SanityVehicle[] = Array.from(
            { length: ITEMS_PER_PAGE },
            (_, i) => ({
              _id: `mock-${i}`,
              brand: ["Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Toyota"][
                i % 5
              ],
              model: `Model ${String.fromCharCode(65 + (i % 5))}`,
              year: 2020 + (i % 5),
              gallery: [
                {
                  image: {
                    asset: {
                      url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop",
                    },
                  },
                  alt: `Vehicle ${i}`,
                  imageType: "exterior",
                },
              ],
              priceRange: {
                min: 20000 + i * 1000,
                max: 30000 + i * 1000,
                currency: "USD",
              },
              isOnSale: i % 3 === 0,
              isNewEnergy: i % 4 === 0,
              slug: { current: `vehicle-${i}` },
            }),
          );

          const transformedVehicles: Vehicle[] = mockVehicles.map((v) => ({
            id: v._id,
            brand: v.brand,
            model: v.model,
            year: v.year,
            type: "",
            category: "",
            images:
              v.gallery?.map((img, idx) => ({
                id: `${v._id}-img-${idx}`,
                url: img.image?.asset?.url || "",
                alt: img.alt || `${v.brand} ${v.model}`,
                type: (img.imageType as "exterior") || "exterior",
              })) || [],
            priceRange: v.priceRange
              ? {
                  min: v.priceRange.min,
                  max: v.priceRange.max,
                  currency: v.priceRange.currency || "USD",
                }
              : undefined,
            isOnSale: v.isOnSale || false,
            isNewEnergy: v.isNewEnergy || false,
            imageCount: v.gallery?.length || 0,
            slug: v.slug?.current,
          }));

          if (append) {
            appendVehicles(transformedVehicles);
          } else {
            setVehicles(transformedVehicles);
          }

          setTotalCount(6907); // Mock total
          setHasMore(page < Math.ceil(6907 / ITEMS_PER_PAGE));
          setCurrentPage(page);
          setLoading(false);
          return;
        }

        // Fetch vehicles
        const query = vehiclesByFiltersQuery(filters);
        const fetchedVehicles = await client.fetch<SanityVehicle[]>(
          query,
          params,
        );

        // Transform Sanity data to Vehicle format
        const transformedVehicles: Vehicle[] = fetchedVehicles.map((v) => ({
          id: v._id,
          brand: v.brand,
          model: v.model,
          year: v.year,
          type: v.type?.slug?.current || "",
          category: v.type?.category?.slug?.current || "",
          images:
            v.gallery?.map(
              (
                img: NonNullable<SanityVehicle["gallery"]>[number],
                idx: number,
              ) => ({
                id: `${v._id}-img-${idx}`,
                url: img.image?.asset?.url || "",
                alt: img.alt || `${v.brand} ${v.model}`,
                type:
                  (img.imageType as Vehicle["images"][number]["type"]) ||
                  "exterior",
              }),
            ) || [],
          priceRange: v.priceRange
            ? {
                min: v.priceRange.min,
                max: v.priceRange.max,
                currency: v.priceRange.currency || "USD",
              }
            : undefined,
          specs: v.specs,
          isOnSale: v.isOnSale || false,
          isNewEnergy: v.isNewEnergy || false,
          imageCount: v.gallery?.length || 0,
          slug: v.slug?.current,
          publishedAt: v.publishedAt,
        }));

        // Fetch total count
        if (client) {
          const countFilters = {
            brandFilter: filters.brandFilter,
            typeFilter: filters.typeFilter,
            onSaleFilter: filters.onSaleFilter,
            newEnergyFilter: filters.newEnergyFilter,
            fuelTypeFilter: filters.fuelTypeFilter,
          };
          const countQuery = vehiclesCountQuery(countFilters);
          const countParams: Record<string, unknown> = {};
          if (selectedBrand) {
            countParams.brandFilter = filters.brandFilter;
          }
          if (selectedType) {
            countParams.typeFilter = selectedType;
          }
          if (fuelType) {
            countParams.fuelTypeFilter = filters.fuelTypeFilter;
          }
          const totalCount = await client.fetch<number>(
            countQuery,
            countParams,
          );
          const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

          if (append) {
            appendVehicles(transformedVehicles);
          } else {
            setVehicles(transformedVehicles);
          }

          setTotalCount(totalCount);
          setHasMore(page < totalPages);
          setCurrentPage(page);
        } else {
          // Mock count if Sanity not configured
          setTotalCount(6907);
          setHasMore(true);
          setCurrentPage(page);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch vehicles",
        );
        console.error("Error fetching vehicles:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      selectedBrand,
      selectedType,
      onlyOnSale,
      onlyNewEnergy,
      fuelType,
      setVehicles,
      appendVehicles,
      setLoading,
      setTotalCount,
      setHasMore,
      setCurrentPage,
    ],
  );

  const loadMore = () => {
    const state = useGalleryStore.getState();
    if (!isLoading && state.vehicles.length < state.totalCount) {
      fetchVehicles(state.currentPage + 1, true);
    }
  };

  // Initial load and refetch on filter changes
  useEffect(() => {
    fetchVehicles(1, false);
  }, [fetchVehicles]);

  return {
    vehicles,
    isLoading,
    error,
    loadMore,
    hasMore: useGalleryStore.getState().hasMore,
    totalCount: useGalleryStore.getState().totalCount,
  };
}
