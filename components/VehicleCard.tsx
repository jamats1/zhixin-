"use client";

import Image from "next/image";
import Link from "next/link";
import type { CarPart, Vehicle } from "@/types";

type ItemCardProps = {
  vehicle: Vehicle | CarPart;
  isCarPart?: boolean;
};

export default function VehicleCard({ vehicle, isCarPart = false }: ItemCardProps) {
  // Safety check
  if (!vehicle) {
    return null;
  }

  const formatPrice = (priceRange?: {
    min: number;
    max: number;
    currency: string;
  }) => {
    if (!priceRange) return "Price TBD";
    try {
      const { min, max, currency } = priceRange;
      if (currency === "USD") {
        return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
      }
      return `${min} - ${max} ${currency}`;
    } catch (error) {
      console.error("Error formatting price:", error);
      return "Price TBD";
    }
  };

  const isVehicle = "brand" in vehicle && "model" in vehicle;
  const title = isVehicle 
    ? `${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "Untitled"
    : (vehicle.name || "Untitled");
  const imageAlt = isVehicle
    ? `${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "Vehicle"
    : (vehicle.name || "Car Part");
  const imageCount = isVehicle 
    ? (vehicle as Vehicle).imageCount || ((vehicle as Vehicle).images?.length || 0)
    : (vehicle.images?.length || 0);
  const detailUrl = isVehicle 
    ? `/vehicle/${vehicle.id}`
    : `/car-part/${vehicle.id}`;
  const vrUrl = isVehicle 
    ? `/vehicle/${vehicle.id}/vr`
    : undefined;

  const primaryImage = vehicle.images?.[0] || {
    url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop",
    alt: imageAlt,
    type: "exterior" as const,
  };

  // Ensure we have a valid image URL
  const imageUrl = primaryImage?.url || "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop";

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow">
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-gray-100">
        <Image
          src={imageUrl}
          alt={primaryImage?.alt || imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          onError={(e) => {
            // Fallback to placeholder on error
            const target = e.target as HTMLImageElement;
            if (target) {
              target.src = "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop";
            }
          }}
        />

        {/* Image Count Overlay */}
        {imageCount > 0 && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
            {imageCount} images
          </div>
        )}

        {/* VR View Link - Only for vehicles */}
        {vrUrl && (
          <Link
            href={vrUrl}
            className="absolute top-2 right-2 text-white text-xs hover:text-[var(--primary)] transition-colors flex items-center gap-1"
          >
            <span>VR View</span>
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h3>

        {/* Part Number for Car Parts */}
        {isCarPart && "partNumber" in vehicle && vehicle.partNumber && (
          <div className="text-xs text-[var(--text-tertiary)] mb-2">
            Part #: {vehicle.partNumber}
          </div>
        )}

        {/* Price Range */}
        <div className="text-sm text-[var(--text-secondary)] mb-4">
          {formatPrice(vehicle.priceRange)}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded hover:bg-[var(--primary-hover)] transition-colors font-medium text-sm"
          >
            {isCarPart ? "Add to Cart" : "Inquire Price"}
          </button>
          <Link
            href={detailUrl}
            className="px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors font-medium text-sm"
          >
            {isCarPart ? "View Details" : "View Series"}
          </Link>
        </div>
      </div>
    </div>
  );
}
