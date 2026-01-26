"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useCarParts } from "@/hooks/useCarParts";
import { useVehicles } from "@/hooks/useVehicles";
import { useCarPartsStore } from "@/stores/carPartsStore";
import { useFilterStore } from "@/stores/filterStore";
import { useGalleryStore } from "@/stores/galleryStore";
import { useUIStore } from "@/stores/uiStore";
import VehicleCard from "./VehicleCard";

export default function VehicleGrid() {
  const { currentView } = useUIStore();
  const isVehiclesView = currentView === "imageList";
  const isCarPartsView = currentView === "featuredAlbums";

  // Get filter state to show active filters
  const {
    selectedBrand,
    onlyOnSale,
    onlyNewEnergy,
    fuelType,
    selectedCarPartCategory,
    resetFilters,
    setBrand,
    setOnlyOnSale,
    setOnlyNewEnergy,
    setFuelType,
    setCarPartCategory,
  } = useFilterStore();

  // Conditionally use hooks based on view to avoid unnecessary fetches
  const vehiclesHook = useVehicles();
  const carPartsHook = useCarParts();

  // Use appropriate store and hook based on view
  const { vehicles, totalCount: vehiclesCount } = useGalleryStore();
  const { carParts, totalCount: carPartsCount } = useCarPartsStore();
  
  const items = isVehiclesView ? vehicles : carParts;
  const totalCount = isVehiclesView ? vehiclesCount : carPartsCount;
  const isLoading = isVehiclesView ? vehiclesHook.isLoading : carPartsHook.isLoading;
  const hasMore = isVehiclesView ? vehiclesHook.hasMore : carPartsHook.hasMore;
  const loadMore = isVehiclesView ? vehiclesHook.loadMore : carPartsHook.loadMore;
  const itemType = isVehiclesView ? "vehicles" : "car parts";

  // Check if any filters are active
  const hasActiveFilters = isVehiclesView
    ? !!(selectedBrand || onlyOnSale || onlyNewEnergy || fuelType)
    : !!(selectedBrand || onlyOnSale || selectedCarPartCategory);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scroll observer with cross-browser support
  useEffect(() => {
    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === "undefined") {
      // Fallback for browsers without IntersectionObserver
      return;
    }

    const currentTarget = observerTarget.current;
    if (!currentTarget || !hasMore || isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(currentTarget);

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMore, currentView]);

  return (
    <>
      {/* Results Count - Sticky aligned with reference */}
      <div className="sticky top-[60px] md:top-[71px] z-10 bg-white pb-2 md:pb-3 pt-2 md:pt-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs md:text-sm font-[300] text-[#828CA0]">
            Total{" "}
            <em className="not-italic text-[#FF6600]">{totalCount}</em>{" "}
            <span className="hidden sm:inline">{itemType} match criteria</span>
            <span className="sm:hidden">found</span>
          </span>
          
          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--text-tertiary)]">Active filters:</span>
              {isVehiclesView && (
                <>
                  {onlyOnSale && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-xs">
                      On Sale
                      <button
                        type="button"
                        onClick={() => setOnlyOnSale(false)}
                        className="hover:bg-[var(--primary)]/20 rounded-full p-0.5"
                        aria-label="Remove On Sale filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {onlyNewEnergy && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-xs">
                      New Energy
                      <button
                        type="button"
                        onClick={() => setOnlyNewEnergy(false)}
                        className="hover:bg-[var(--primary)]/20 rounded-full p-0.5"
                        aria-label="Remove New Energy filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {fuelType && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-xs capitalize">
                      {fuelType}
                      <button
                        type="button"
                        onClick={() => setFuelType(null)}
                        className="hover:bg-[var(--primary)]/20 rounded-full p-0.5"
                        aria-label={`Remove ${fuelType} filter`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </>
              )}
              {selectedBrand && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-xs">
                  Brand: {selectedBrand}
                  <button
                    type="button"
                    onClick={() => setBrand(null)}
                    className="hover:bg-[var(--primary)]/20 rounded-full p-0.5"
                    aria-label="Remove brand filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {isCarPartsView && selectedCarPartCategory && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded text-xs capitalize">
                  {selectedCarPartCategory}
                  <button
                    type="button"
                    onClick={() => setCarPartCategory(null)}
                    className="hover:bg-[var(--primary)]/20 rounded-full p-0.5"
                    aria-label="Remove category filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--primary)] underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div>
        {isLoading && items.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            Loading {itemType}...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            No {itemType} found
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {items.map((item) => {
              if (!item || !item.id) return null;
              return (
                <VehicleCard 
                  key={item.id} 
                  vehicle={item as any} 
                  isCarPart={isCarPartsView} 
                />
              );
            })}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && <div ref={observerTarget} className="h-20" />}

        {/* Loading More Indicator */}
        {isLoading && items.length > 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            Loading more...
          </div>
        )}
      </div>
    </>
  );
}
