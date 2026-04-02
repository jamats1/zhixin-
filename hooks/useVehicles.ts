import { useCallback, useEffect, useState } from "react";
import client, { urlFor } from "@/lib/sanity/client";
import {
  vehicleSeriesByFiltersQuery,
  vehicleSeriesCountQuery,
} from "@/lib/sanity/queries";
import { useFilterStore } from "@/stores/filterStore";
import { useGalleryStore } from "@/stores/galleryStore";
import { useUIStore } from "@/stores/uiStore";
import type { Vehicle } from "@/types";

type SanityVehicleSeries = {
  _id: string;
  title: string;
  slug?: string;
  thumbnail?: { asset?: { _ref?: string }; [k: string]: unknown };
  images?: Array<{ asset?: { _ref?: string }; [k: string]: unknown }>;
  priceRange?: { min?: number; max?: number; raw?: string };
  isOnSale?: boolean;
  isNewEnergy?: boolean;
  tagline?: string;
  category?: { _id: string; title?: string; slug?: string };
  type?: { _id: string; title?: string; slug?: string };
  brand?: {
    _id: string;
    title?: string;
    slug?: string;
    logo?: { asset?: { _ref?: string }; [k: string]: unknown };
  };
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
    selectedCategory,
    onlyOnSale,
    onlyNewEnergy,
    fuelType,
    searchQuery,
  } = useFilterStore();
  const { currentView } = useUIStore();
  const [error, setError] = useState<string | null>(null);

  const fetchVehicles = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const start = (page - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;

        const seriesFilters: {
          categoryFilter?: string;
          typeFilter?: string;
          brandFilter?: string;
          segmentFilter?: "car" | "truck";
          excludeTruck?: boolean;
          onSaleFilter?: boolean;
          newEnergyFilter?: boolean;
          fuelFilter?: string;
          searchPattern?: string;
          start: number;
          end: number;
        } = { start, end };

        if (selectedCategory && selectedCategory !== "all") {
          seriesFilters.categoryFilter = selectedCategory;
        }
        if (selectedType && selectedType !== "all") {
          seriesFilters.typeFilter = selectedType;
        }
        if (selectedBrand) {
          seriesFilters.brandFilter = selectedBrand;
        }
        // Keep Vehicles and Trucks tabs isolated by segment.
        if (currentView === "truckList") {
          seriesFilters.segmentFilter = "truck";
        } else if (currentView === "imageList") {
          seriesFilters.excludeTruck = true;
        }
        if (onlyOnSale) seriesFilters.onSaleFilter = true;
        if (onlyNewEnergy) seriesFilters.newEnergyFilter = true;

        const trimmedSearch = (searchQuery || "").trim();
        if (trimmedSearch) {
          seriesFilters.searchPattern = `*${trimmedSearch}*`;
        }

        // Map UI fuelType chips to Sanity fuelType patterns
        if (fuelType) {
          switch (fuelType) {
            case "gas":
              // Petrol / Gasoline
              seriesFilters.fuelFilter = "Petrol|Gas";
              break;
            case "diesel":
              seriesFilters.fuelFilter = "Diesel";
              break;
            case "electric":
              seriesFilters.fuelFilter = "Electric|BEV|EV";
              break;
            case "phev":
              seriesFilters.fuelFilter = "PHEV";
              break;
            case "hybrid":
              seriesFilters.fuelFilter = "Hybrid";
              break;
            case "hydrogen":
              seriesFilters.fuelFilter = "Hydrogen";
              break;
            default:
              break;
          }
        }

        const params: Record<string, unknown> = { start, end };
        if (seriesFilters.categoryFilter)
          params.categoryFilter = seriesFilters.categoryFilter;
        if (seriesFilters.typeFilter)
          params.typeFilter = seriesFilters.typeFilter;
        if (seriesFilters.brandFilter)
          params.brandFilter = seriesFilters.brandFilter;
        if (seriesFilters.segmentFilter)
          params.segmentFilter = seriesFilters.segmentFilter;
        if (seriesFilters.fuelFilter)
          params.fuelFilter = seriesFilters.fuelFilter;
        if (seriesFilters.searchPattern)
          params.searchPattern = seriesFilters.searchPattern;

        if (!client) {
          setVehicles([]);
          setTotalCount(0);
          setHasMore(false);
          setCurrentPage(1);
          setLoading(false);
          setError(
            "Sanity client not configured. Set NEXT_PUBLIC_SANITY_PROJECT_ID (and optionally NEXT_PUBLIC_SANITY_DATASET) in .env.local.",
          );
          return;
        }

        const countFilters = {
          categoryFilter: seriesFilters.categoryFilter,
          typeFilter: seriesFilters.typeFilter,
          brandFilter: seriesFilters.brandFilter,
          segmentFilter: seriesFilters.segmentFilter,
          excludeTruck: seriesFilters.excludeTruck,
          onSaleFilter: seriesFilters.onSaleFilter,
          newEnergyFilter: seriesFilters.newEnergyFilter,
          fuelFilter: seriesFilters.fuelFilter,
          searchPattern: seriesFilters.searchPattern,
        };
        const countParams: Record<string, unknown> = {};
        if (countFilters.categoryFilter)
          countParams.categoryFilter = countFilters.categoryFilter;
        if (countFilters.typeFilter)
          countParams.typeFilter = countFilters.typeFilter;
        if (countFilters.brandFilter)
          countParams.brandFilter = countFilters.brandFilter;
        if (countFilters.segmentFilter)
          countParams.segmentFilter = countFilters.segmentFilter;
        if (countFilters.fuelFilter)
          countParams.fuelFilter = countFilters.fuelFilter;
        if (countFilters.searchPattern)
          countParams.searchPattern = countFilters.searchPattern;

        const query = vehicleSeriesByFiltersQuery(seriesFilters);
        const [fetchedSeries, totalCount] = await Promise.all([
          client.fetch<any[]>(query, params),
          client.fetch<number>(
            vehicleSeriesCountQuery(countFilters),
            countParams,
          ),
        ]);

        const transformedVehicles: Vehicle[] = fetchedSeries.map((s) => {
          if (s._type === "vehicle") {
            return {
              id: s._id,
              title: s.title,
              brand: s.brand?.title ?? s.brand?.name ?? "",
              model: s.model ?? "",
              year: s.year ?? 0,
              registrationYear: s.registrationYear,
              mileage: s.mileage,
              fuelType: s.fuelType,
              engineDisplacement: s.engineDisplacement,
              transmission: s.transmission,
              price: s.price,
              sku: s.sku,
              type: s.type?.slug ?? "",
              category: s.category?.slug ?? "",
              images:
                s.images?.map((img: any, i: number) => ({
                  id: `${s._id}-img-${i}`,
                  url: urlFor(img).width(800).quality(75).url(),
                  alt: s.title,
                  type: "exterior",
                })) || [],
              priceRange: s.price
                ? { min: s.price, max: s.price, currency: "USD" }
                : undefined,
              isOnSale: s.isOnSale ?? true,
              isNewEnergy:
                s.isNewEnergy ?? ["BEV", "PHEV"].includes(s.fuelType),
              imageCount: s.images?.length || 0,
              slug: s.slug?.current,
              features: s.features,
              bodyType: s.bodyType,
              seats: s.seats,
              doors: s.doors,
              weightKg: s.weightKg,
              batteryCapacityKwh: s.batteryCapacityKwh,
              rangeKm: s.rangeKm,
              drivetrain: s.drivetrain,
            };
          }

          // Existing vehicleSeries transformation
          const images: Vehicle["images"] = [];
          const brandLogoUrl = s.brand?.logo
            ? urlFor(s.brand.logo).width(800).height(600).fit("max").url()
            : "";
          if (brandLogoUrl) {
            images.push({
              id: `${s._id}-brand-logo`,
              url: brandLogoUrl,
              alt: s.brand?.title ? `${s.brand.title} logo` : s.title,
              type: "exterior",
            });
          }
          const pr = s.priceRange;
          const priceRange =
            pr?.min != null && pr?.max != null
              ? { min: pr.min, max: pr.max, currency: "CNY" }
              : undefined;
          return {
            id: s._id,
            title: s.title,
            brand: s.brand?.title ?? "",
            model: s.title,
            year: 0,
            type: s.type?.slug ?? "",
            category: s.category?.slug ?? "",
            images:
              images.length > 0
                ? images
                : [
                    {
                      id: `${s._id}-placeholder`,
                      url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop",
                      alt: s.title,
                      type: "exterior" as const,
                    },
                  ],
            priceRange,
            isOnSale: s.isOnSale ?? false,
            isNewEnergy: s.isNewEnergy ?? false,
            imageCount: images.length,
            slug:
              s.slug?.current ||
              (typeof s.slug === "string" ? s.slug : undefined),
            registrationYear: s.registrationYear,
            mileage: s.mileage,
            fuelType: s.fuelType,
            engineDisplacement: s.engineDisplacement,
            transmission: s.transmission,
          };
        });

        const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
        if (append) {
          appendVehicles(transformedVehicles);
        } else {
          setVehicles(transformedVehicles);
        }
        setTotalCount(totalCount);
        setHasMore(page < totalPages);
        setCurrentPage(page);
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
      selectedCategory,
      onlyOnSale,
      onlyNewEnergy,
      fuelType,
      searchQuery,
      currentView,
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
    refetch: () => fetchVehicles(1, false),
  };
}
