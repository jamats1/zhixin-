"use client";

import { useEffect, useRef } from "react";
import { useVehicles } from "@/hooks/useVehicles";
import { useGalleryStore } from "@/stores/galleryStore";
import VehicleCard from "./VehicleCard";

export default function VehicleGrid() {
  const { vehicles, totalCount } = useGalleryStore();
  const { isLoading, hasMore, loadMore } = useVehicles();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, loadMore]);

  return (
    <>
      {/* Results Count - Sticky aligned with reference */}
      <div className="sticky top-[71px] z-10">
        <div className="flex justify-between bg-white pb-3 pt-3">
          <h3 className="flex items-center leading-5 text-[var(--text-primary)]">
            <span className="mr-4 text-sm font-[300] text-[#828CA0]">
              Total{" "}
              <em className="not-italic text-[#FF6600]">{totalCount}</em>{" "}
              vehicles match criteria
            </span>
          </h3>
        </div>
      </div>

      {/* Grid */}
      <div>
        {isLoading && vehicles.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            Loading vehicles...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            No vehicles found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && <div ref={observerTarget} className="h-20" />}

        {/* Loading More Indicator */}
        {isLoading && vehicles.length > 0 && (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            Loading more...
          </div>
        )}
      </div>
    </>
  );
}
