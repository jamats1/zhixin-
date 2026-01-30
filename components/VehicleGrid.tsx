"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBrands } from "@/hooks/useBrands";
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
  const { brands } = useBrands();

  // Get filter state to show active filters
  const {
    selectedBrand,
    selectedType,
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
  const vehiclesError = vehiclesHook.error;

  // Use appropriate store and hook based on view
  const { vehicles, totalCount: vehiclesCount } = useGalleryStore();
  const { carParts, totalCount: carPartsCount } = useCarPartsStore();
  
  const items = isVehiclesView ? vehicles : carParts;
  const totalCount = isVehiclesView ? vehiclesCount : carPartsCount;
  const isLoading = isVehiclesView ? vehiclesHook.isLoading : carPartsHook.isLoading;
  const hasMore = isVehiclesView ? vehiclesHook.hasMore : carPartsHook.hasMore;
  const loadMore = isVehiclesView ? vehiclesHook.loadMore : carPartsHook.loadMore;
  const itemType = isVehiclesView ? "vehicles" : "car parts";

  // Check if any filters are active (only show "match criteria" after user selects something)
  const hasActiveFilters = isVehiclesView
    ? !!(selectedBrand || selectedType || onlyOnSale || onlyNewEnergy || fuelType)
    : !!(selectedBrand || onlyOnSale || selectedCarPartCategory);

  const observerTarget = useRef<HTMLDivElement>(null);

  // Pull-to-refresh state (mobile)
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

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

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window === "undefined") return;
    if (window.scrollY > 0) return;
    if (e.touches.length !== 1) return;
    isPulling.current = true;
    pullStartY.current = e.touches[0].clientY;
    setPullDistance(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isPulling.current || pullStartY.current == null) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY.current;
    if (distance <= 0) {
      setPullDistance(0);
      return;
    }
    // Limit max pull distance
    setPullDistance(Math.min(distance, 100));
  };

  const handleTouchEnd = () => {
    if (!isPulling.current) return;
    const threshold = 60;
    const shouldRefresh = pullDistance > threshold;
    setPullDistance(0);
    isPulling.current = false;
    pullStartY.current = null;

    if (shouldRefresh) {
      if (isVehiclesView && typeof vehiclesHook.refetch === "function") {
        vehiclesHook.refetch();
      } else if (isCarPartsView && typeof carPartsHook.refetch === "function") {
        carPartsHook.refetch();
      }
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="touch-pan-y"
    >
      {/* Pull to refresh indicator - mobile only */}
      {pullDistance > 0 && (
        <div className="md:hidden text-center text-[var(--text-tertiary)] text-xs py-1">
          {pullDistance < 60 ? "Pull to refresh" : "Release to refresh"}
        </div>
      )}

      {/* Results Count - Sticky aligned with reference */}
      <div className="sticky top-[60px] md:top-[71px] z-10 bg-white pb-2 md:pb-3 pt-2 md:pt-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <span className="text-xs md:text-sm font-[300] text-[#828CA0]">
            Total{" "}
            <em className="not-italic text-[#FF6600]">{totalCount}</em>{" "}
            {hasActiveFilters ? (
              <span className="hidden sm:inline">{itemType} match criteria</span>
            ) : (
              <span className="hidden sm:inline">{itemType}</span>
            )}
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
                  Brand: {brands?.find((b) => b.id === selectedBrand)?.name ?? selectedBrand}
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
        {isVehiclesView && vehiclesError ? (
          <div className="text-center py-12 text-red-600 text-sm" role="alert">
            {vehiclesError}
          </div>
        ) : isLoading && items.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6 py-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                className="bg-white rounded-lg border border-[var(--border)] overflow-hidden animate-pulse"
              >
                <div className="bg-gray-200 aspect-[4/3]" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-9 bg-gray-200 rounded flex-1" />
                    <div className="h-9 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            No {itemType} found
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
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
    </div>
  );
}
