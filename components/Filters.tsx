"use client";

import Image from "next/image";
import { useBrands } from "@/hooks/useBrands";
import { brandLogoUrl } from "@/lib/sanity/client";
import { useFilterStore } from "@/stores/filterStore";
import { useUIStore } from "@/stores/uiStore";
import type { BrandWithLogo } from "@/types";

const POPULAR_BRANDS_COUNT = 9;

function BrandLogoSmall({
  brand,
  size = 28,
}: {
  brand: BrandWithLogo;
  size?: number;
}) {
  const src = brandLogoUrl(brand.logo, size);
  if (src) {
    return (
      <Image
        src={src}
        alt={`${brand.name} logo`}
        width={size}
        height={size}
        className="shrink-0 rounded object-contain bg-gray-50"
        unoptimized={false}
      />
    );
  }
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded bg-gray-100 text-[var(--text-tertiary)] font-medium text-xs"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {brand.name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

export default function Filters() {
  const { currentView, setCurrentView } = useUIStore();
  const { setBrand, alphabeticalFilter, setAlphabeticalFilter } =
    useFilterStore();
  const { brands } = useBrands();
  const popularBrands = brands.slice(0, POPULAR_BRANDS_COUNT);

  return (
    <>
      {/* Main Categories */}
      <div className="mb-2 md:mb-1 flex flex-wrap border-b border-b-[#E6E9F0] bg-white text-base md:text-lg">
        <button
          type="button"
          onClick={() => setCurrentView("imageList")}
          className={`relative mr-6 md:mr-10 pb-1 after:absolute after:-bottom-0 after:left-0 after:h-[3px] after:w-full transition-colors font-[600] ${
            currentView === "imageList"
              ? "text-[var(--primary)] after:bg-[var(--primary)]"
              : "text-[var(--text-primary)] hover:text-[var(--primary)]"
          }`}
        >
          <h2>Vehicles</h2>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView("featuredAlbums")}
          className={`relative mr-6 md:mr-10 pb-1 after:absolute after:-bottom-0 after:left-0 after:h-[3px] after:w-full transition-colors font-[600] ${
            currentView === "featuredAlbums"
              ? "text-[var(--primary)] after:bg-[var(--primary)]"
              : "text-[var(--text-primary)] hover:text-[var(--primary)]"
          }`}
        >
          <h2>Car Parts</h2>
        </button>
      </div>

      {/* Brand Filter Section - Simplified for mobile */}
      <div className="flex w-full flex-col items-start text-xs md:text-sm text-[var(--text-primary)]">
        <div className="flex w-full items-center">
          <div className="w-12 md:w-14 min-w-[48px] md:min-w-[68px] text-left text-[#828CA0] text-xs md:text-sm">
            Brand
          </div>
          {/* Letter filter - hidden on mobile */}
          <ul className="hidden md:flex w-full whitespace-nowrap border-b border-dashed border-b-[#F0F3F8] py-[15px]">
            <li className="relative mr-0.5 min-w-7 cursor-pointer rounded px-1.5 py-1 text-center bg-[#CCEBFF]">
              <button
                type="button"
                className="w-full"
                onClick={() => setAlphabeticalFilter(null)}
              >
                Hot
              </button>
            </li>
            {Array.from({ length: 26 }, (_, i) =>
              String.fromCharCode(65 + i),
            ).map((letter) => (
              <li
                key={letter}
                className={`relative mr-0.5 min-w-7 cursor-pointer rounded px-1.5 py-1 text-center hover:bg-gray-100 ${
                  alphabeticalFilter === letter ? "bg-[#CCEBFF]" : ""
                }`}
              >
                <button
                  type="button"
                  className="w-full"
                  onClick={() => setAlphabeticalFilter(letter)}
                >
                  {letter}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex w-full items-start border-b border-b-[#F0F3F8] text-xs md:text-sm text-[var(--text-primary)]">
          <div className="w-12 md:w-14 min-w-[48px] md:min-w-[68px] shrink-0" aria-hidden="true" />
          <div className="w-full bg-[#F8F9FC] px-2 md:px-4 pb-2 pt-2 md:pt-3 min-h-[60px] md:h-[84px] overflow-x-auto md:overflow-hidden">
            <div className="flex flex-wrap md:flex-wrap gap-2 md:gap-0">
              {popularBrands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => setBrand(brand.name)}
                  className="relative md:mr-4 flex min-w-[56px] md:min-w-[68px] flex-col items-center justify-center rounded p-1 md:p-1.5 text-[var(--text-primary)] hover:cursor-pointer hover:bg-gray-100 mb-2 md:mb-4"
                >
                  <BrandLogoSmall brand={brand} size={24} />
                  <span className="text-xs">{brand.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Type Filter Section */}
      <div className="flex min-h-7 w-full border-b border-b-[#F0F3F8] py-2 md:py-3 text-xs md:text-sm text-[var(--text-primary)] transition-all last:border-none">
        <div className="w-12 md:w-[68px] leading-5 md:leading-7 text-[#828CA0] text-xs md:text-sm shrink-0">
          Category
        </div>
        <div className="flex flex-1 flex-wrap gap-1.5 md:gap-2 text-nowrap text-xs md:text-sm text-[var(--text-primary)] overflow-x-auto">
          {[
            { label: "All", value: "all" },
            { label: "Cars", value: "cars", mobileLabel: "Cars" },
            { label: "SUVs", value: "suvs", mobileLabel: "SUVs" },
            { label: "MPVs", value: "mpvs", mobileLabel: "MPVs" },
            { label: "Sports", value: "sports", mobileLabel: "Sports" },
            { label: "Minivan", value: "minivan" },
            { label: "Truck", value: "minitruck", mobileLabel: "Truck" },
            { label: "Passenger", value: "light", mobileLabel: "Passenger" },
            { label: "Pickup", value: "pickup" },
          ].map((type) => (
            <button
              type="button"
              key={type.value}
              className="cursor-pointer rounded px-2 md:px-1.5 py-1 text-xs hover:bg-gray-100 whitespace-nowrap"
            >
              <span className="md:w-14">{type.mobileLabel || type.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
