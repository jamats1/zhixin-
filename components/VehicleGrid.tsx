"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBrands } from "@/hooks/useBrands";
import { useCarPartCategories } from "@/hooks/useCarPartCategories";
import { useCarParts } from "@/hooks/useCarParts";
import { useVehicles } from "@/hooks/useVehicles";
import { useCarPartsStore } from "@/stores/carPartsStore";
import { useFilterStore } from "@/stores/filterStore";
import { useGalleryStore } from "@/stores/galleryStore";
import { useUIStore } from "@/stores/uiStore";
import VehicleCard from "./VehicleCard";

export default function VehicleGrid() {
  const { currentView } = useUIStore();
  const isVehiclesView =
    currentView === "imageList" || currentView === "truckList";
  const isCarPartsView = currentView === "featuredAlbums";
  const { brands } = useBrands();
  const { categories: carPartCategories } = useCarPartCategories();

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
  const isLoading = isVehiclesView
    ? vehiclesHook.isLoading
    : carPartsHook.isLoading;
  const hasMore = isVehiclesView ? vehiclesHook.hasMore : carPartsHook.hasMore;
  const loadMore = isVehiclesView
    ? vehiclesHook.loadMore
    : carPartsHook.loadMore;
  const itemType = isCarPartsView
    ? "car parts"
    : currentView === "truckList"
      ? "trucks"
      : "vehicles";

  // Sort vehicles so that the newest (by registrationYear/year) appear first
  const sortedItems = useMemo(() => {
    if (!isVehiclesView) return items;

    return [...items].sort((a: any, b: any) => {
      if (!a || !b) return 0;

      const parseReg = (v: any): { year: number; month: number } => {
        const raw =
          typeof v?.registrationYear === "string" ? v.registrationYear : "";
        const m = raw.match(/^(\d{4})(?:-(\d{1,2}))?/);
        if (m) {
          const year = Number.parseInt(m[1], 10);
          const month = m[2] ? Number.parseInt(m[2], 10) : 1;
          if (!Number.isNaN(year)) {
            return { year, month: Number.isNaN(month) ? 1 : month };
          }
        }
        const y = typeof v?.year === "number" ? v.year : 0;
        return { year: y || 0, month: 1 };
      };

      const aDate = parseReg(a);
      const bDate = parseReg(b);

      if (aDate.year !== bDate.year) return bDate.year - aDate.year;
      if (aDate.month !== bDate.month) return bDate.month - aDate.month;
      return 0;
    });
  }, [items, isVehiclesView]);

  // Check if any filters are active (only show "match criteria" after user selects something)
  const hasActiveFilters = isVehiclesView
    ? !!(
        selectedBrand ||
        selectedType ||
        onlyOnSale ||
        onlyNewEnergy ||
        fuelType
      )
    : !!(selectedBrand || onlyOnSale || selectedCarPartCategory);

  const selectedCarPartCategoryTitle =
    isCarPartsView && selectedCarPartCategory
      ? (carPartCategories.find((c) => c.id === selectedCarPartCategory)
          ?.title ?? selectedCarPartCategory)
      : null;

  // Pull-to-refresh state (mobile)
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartY = useRef<number | null>(null);
  const isPulling = useRef(false);

  const remainingCount = Math.max(0, totalCount - items.length);
  const loadMoreLabel = isCarPartsView ? "Load more parts" : "Load more";

  const prefetchSentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  const isLoadingRef = useRef(isLoading);
  loadMoreRef.current = loadMore;
  isLoadingRef.current = isLoading;

  // Prefetch next page when the user scrolls near the sentinel (keeps Load more as explicit fallback)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (items.length === 0 || !hasMore) return;

    const el = prefetchSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (isLoadingRef.current) return;
        loadMoreRef.current();
      },
      { root: null, rootMargin: "320px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, items.length]);

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
            Total <em className="not-italic text-[#FF6600]">{totalCount}</em>{" "}
            {hasActiveFilters ? (
              <span className="hidden sm:inline">
                {itemType} match criteria
              </span>
            ) : (
              <span className="hidden sm:inline">{itemType}</span>
            )}
            <span className="sm:hidden">found</span>
          </span>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--text-tertiary)]">
                Active filters:
              </span>
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
                  Brand:{" "}
                  {brands?.find((b) => b.id === selectedBrand)?.name ??
                    selectedBrand}
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
                  {selectedCarPartCategoryTitle}
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
          <div
            className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-gray-50 py-16 px-6 text-center dark:bg-zinc-900/40"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2
              className="h-10 w-10 animate-spin text-[var(--primary)]"
              aria-hidden
            />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Loading {itemType}…
            </p>
            <p className="max-w-sm text-xs text-[var(--text-tertiary)]">
              Fetching listings from the catalog. More listings appear when you
              scroll near the bottom or tap{" "}
              <span className="font-medium text-[var(--text-secondary)]">
                {loadMoreLabel}
              </span>
              .
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            No {itemType} found
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
              {sortedItems.map((item: any) => {
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
            {hasMore && (
              <div
                ref={prefetchSentinelRef}
                className="pointer-events-none h-1 w-full shrink-0"
                aria-hidden
              />
            )}
          </>
        )}

        {items.length > 0 && hasMore && (
          <div className="mt-8 flex flex-col items-center gap-3 border-t border-[var(--border)] pt-8 pb-4">
            <p className="text-center text-xs text-[var(--text-tertiary)]">
              Showing{" "}
              <span className="font-medium text-[var(--text-secondary)]">
                {items.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-[var(--text-secondary)]">
                {totalCount}
              </span>
              {remainingCount > 0 ? (
                <>
                  {" "}
                  · {remainingCount} more{" "}
                  {remainingCount === 1 ? "listing" : "listings"}
                </>
              ) : null}
            </p>
            <p className="text-center text-[11px] text-[var(--text-tertiary)]">
              Scrolling near the end loads the next page automatically.
            </p>
            <button
              type="button"
              onClick={() => loadMore()}
              disabled={isLoading}
              className="inline-flex min-h-[44px] min-w-[200px] items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="h-4 w-4 shrink-0 animate-spin"
                    aria-hidden
                  />
                  Loading…
                </>
              ) : (
                loadMoreLabel
              )}
            </button>
          </div>
        )}

        {items.length > 0 && !hasMore && totalCount > 0 && (
          <p className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
            You&apos;ve reached the end — all {totalCount}{" "}
            {totalCount === 1 ? "listing" : "listings"} are shown.
          </p>
        )}
      </div>
    </div>
  );
}
