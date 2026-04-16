"use client";

import Link from "next/link";
import { getSiteWhatsAppDigits } from "@/lib/site-whatsapp";
import type { CarPart, Vehicle } from "@/types";

const FALLBACK_IMAGE_URL =
  "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop";

function openWhatsAppListingInquiry(opts: {
  phoneDigits: string;
  listingTitle: string;
  productPath: string;
}) {
  if (!opts.phoneDigits || typeof window === "undefined") return;
  const listingUrl = `${window.location.origin}${opts.productPath}`;
  const lead = "Hi, I'd like to inquire about pricing for:";
  const message = `${lead}

${opts.listingTitle}

Product page: ${listingUrl}

Please reply when you can. Thank you!`;
  const url = `https://wa.me/${opts.phoneDigits}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

type ItemCardProps = {
  vehicle: Vehicle | CarPart;
  isCarPart?: boolean;
};

export default function VehicleCard({
  vehicle,
  isCarPart = false,
}: ItemCardProps) {
  // Safety check
  if (!vehicle) {
    return null;
  }

  const formatPrice = (priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  }) => {
    if (priceRange == null) return "Price TBD";
    const { min, max, currency = "USD" } = priceRange;
    if (min == null || max == null) return "Price TBD";
    if (!Number.isFinite(min) || !Number.isFinite(max)) return "Price TBD";
    try {
      const loc = "en-US" as const;
      if (currency === "USD") {
        if (min === max) {
          return `$${min.toLocaleString(loc)}`;
        }
        return `$${min.toLocaleString(loc)} - $${max.toLocaleString(loc)}`;
      }
      if (min === max) {
        return `${min.toLocaleString(loc)} ${currency}`;
      }
      return `${min.toLocaleString(loc)} - ${max.toLocaleString(loc)} ${currency}`;
    } catch (error) {
      console.error("Error formatting price:", error);
      return "Price TBD";
    }
  };

  const isVehicle = "brand" in vehicle && "model" in vehicle;
  const title = isVehicle
    ? (() => {
        const brand = (vehicle.brand || "").trim();
        const model = (vehicle.model || "").trim();

        // Prefer brand + model when model is present and not identical to brand
        if (model && model.toLowerCase() !== brand.toLowerCase()) {
          return `${brand ? `${brand} ` : ""}${model}`.trim();
        }

        // If model is missing or same as brand, fall back to the full title from Sanity
        if ("title" in vehicle && vehicle.title) return vehicle.title;

        // Last resort: brand only or generic label
        if (brand) return brand;
        return "Untitled";
      })()
    : vehicle.name || "Untitled";
  const imageAlt = isVehicle
    ? `${vehicle.brand || ""} ${vehicle.model || ""}`.trim() || "Vehicle"
    : vehicle.name || "Car Part";
  const imageCount = isVehicle
    ? (vehicle as Vehicle).imageCount ||
      (vehicle as Vehicle).images?.length ||
      0
    : vehicle.images?.length || 0;
  const slug =
    "slug" in vehicle && vehicle.slug && String(vehicle.slug).trim()
      ? String(vehicle.slug).trim()
      : null;
  const detailUrl = isVehicle
    ? slug
      ? `/vehicle/${slug}`
      : `/vehicle/id/${vehicle.id}`
    : slug
      ? `/car-part/${slug}`
      : `/car-part/id/${vehicle.id}`;
  const vrUrl = isVehicle && slug ? `/vehicle/${slug}/vr` : undefined;

  const primaryImage = vehicle.images?.[0] || {
    url: FALLBACK_IMAGE_URL,
    alt: imageAlt,
    type: "exterior" as const,
  };

  const imageUrl = primaryImage?.url || FALLBACK_IMAGE_URL;

  const whatsappDigits = getSiteWhatsAppDigits();

  return (
    <article className="group bg-white rounded-xl sm:rounded-lg overflow-hidden border border-[var(--border)] shadow-sm hover:shadow-lg transition-shadow transition-transform active:scale-[0.98] active:opacity-95 touch-manipulation">
      {/* Image: native img to avoid Next image optimizer timeouts; Sanity CDN URLs loaded directly */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={primaryImage?.alt || imageAlt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== FALLBACK_IMAGE_URL) {
              target.src = FALLBACK_IMAGE_URL;
            }
          }}
        />

        {/* Image Count Overlay */}
        {imageCount > 0 && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] sm:text-xs px-2 py-1 rounded-md">
            {imageCount} images
          </div>
        )}

        {/* VR View Link - Only for vehicles */}
        {vrUrl && (
          <Link
            href={vrUrl}
            className="absolute top-2 right-2 flex min-h-10 min-w-10 items-center justify-center rounded-md bg-black/45 px-2 text-white text-[11px] sm:text-xs font-medium hover:bg-black/55 hover:text-[var(--primary)] transition-colors"
          >
            <span>VR</span>
          </Link>
        )}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        {/* Title */}
        <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-1.5 sm:mb-2 line-clamp-2 leading-snug">
          {title}
        </h3>

        {/* Part Number for Car Parts */}
        {isCarPart && "partNumber" in vehicle && vehicle.partNumber && (
          <div className="text-xs text-[var(--text-tertiary)] mb-2">
            Part #: {vehicle.partNumber}
          </div>
        )}

        {/* Price */}
        <div className="text-sm mb-3 sm:mb-4">
          <span className="font-semibold text-blue-600 tabular-nums">
            {formatPrice(vehicle.priceRange)}
          </span>
        </div>

        {/* Specs Grid – only show columns that have values (avoids "-" for unfilled vehicles) */}
        {isVehicle &&
          (() => {
            const v = vehicle as Vehicle;
            const specs = [
              {
                label: "Reg. Year",
                value: v.registrationYear,
                className: "text-green-600",
              },
              {
                label: "Mlg(km)",
                value:
                  v.mileage != null ? v.mileage.toLocaleString("en-US") : null,
                className: "text-gray-900",
              },
              {
                label: "Fuel",
                value: v.fuelType || null,
                className: "text-green-600",
              },
              {
                label: "Engine(cc)",
                value: v.engineDisplacement || null,
                className: "text-gray-900",
              },
              {
                label: "Transm.",
                value: v.transmission || null,
                className: "text-gray-900",
              },
            ].filter((s) => s.value != null && s.value !== "");
            if (specs.length === 0) return null;
            return (
              <div
                className="grid gap-1 border-t border-gray-100 pt-2.5 sm:pt-3 mb-3 sm:mb-4 text-[10px] sm:text-xs text-center"
                style={{
                  gridTemplateColumns: `repeat(${specs.length}, minmax(0, 1fr))`,
                }}
              >
                {specs.map((s, i) => (
                  <div
                    key={s.label}
                    className={`flex flex-col gap-1 ${i > 0 ? "border-l border-gray-100" : ""}`}
                  >
                    <span className="text-gray-400 uppercase">{s.label}</span>
                    <span className={`font-bold ${s.className}`}>
                      {s.value}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}

        {/* Action Buttons — stacked on narrow cards, row from sm */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <button
            type="button"
            className="w-full sm:flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors font-medium text-sm min-h-[48px] sm:min-h-[44px] flex items-center justify-center touch-manipulation"
            aria-label="WhatsApp Me about this listing"
            onClick={() =>
              openWhatsAppListingInquiry({
                phoneDigits: whatsappDigits,
                listingTitle: title,
                productPath: detailUrl,
              })
            }
          >
            WhatsApp Me
          </button>
          <Link
            href={detailUrl}
            className="w-full sm:w-auto sm:shrink-0 px-4 py-2.5 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors font-medium text-sm min-h-[48px] sm:min-h-[44px] flex items-center justify-center touch-manipulation"
          >
            {isCarPart ? "View Details" : "View Series"}
          </Link>
        </div>
      </div>
    </article>
  );
}
