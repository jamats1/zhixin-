"use client";

import Image from "next/image";
import Link from "next/link";
import type { Vehicle } from "@/types";

type VehicleCardProps = {
  vehicle: Vehicle;
};

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const formatPrice = (priceRange?: {
    min: number;
    max: number;
    currency: string;
  }) => {
    if (!priceRange) return "Price TBD";
    const { min, max, currency } = priceRange;
    if (currency === "USD") {
      return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    }
    return `${min} - ${max} ${currency}`;
  };

  const primaryImage = vehicle.images[0] || {
    url: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop",
    alt: `${vehicle.brand} ${vehicle.model}`,
    type: "exterior" as const,
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow">
      {/* Image Container */}
      <div className="relative aspect-[4/3] bg-gray-100">
        <Image
          src={primaryImage.url}
          alt={primaryImage.alt || `${vehicle.brand} ${vehicle.model}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />

        {/* Image Count Overlay */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {vehicle.imageCount} images
        </div>

        {/* VR View Link */}
        <Link
          href={`/vehicle/${vehicle.id}/vr`}
          className="absolute top-2 right-2 text-white text-xs hover:text-[var(--primary)] transition-colors flex items-center gap-1"
        >
          <span>VR View</span>
        </Link>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Model Name */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {vehicle.brand} {vehicle.model}
        </h3>

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
            Inquire Price
          </button>
          <Link
            href={`/vehicle/${vehicle.id}`}
            className="px-4 py-2 border border-[var(--border)] text-[var(--text-primary)] rounded hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors font-medium text-sm"
          >
            View Series
          </Link>
        </div>
      </div>
    </div>
  );
}
