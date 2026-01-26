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
  const { 
    setBrand, 
    alphabeticalFilter, 
    setAlphabeticalFilter, 
    selectedCarPartCategory, 
    setCarPartCategory,
    onlyOnSale,
    onlyNewEnergy,
    fuelType,
    setOnlyOnSale,
    setOnlyNewEnergy,
    setFuelType,
  } = useFilterStore();
  const { brands } = useBrands();
  const popularBrands = (brands || []).slice(0, POPULAR_BRANDS_COUNT);

  const isVehiclesView = currentView === "imageList";
  const isCarPartsView = currentView === "featuredAlbums";

  // Car Parts Categories
  const carPartCategories = [
    { label: "All", value: "all" },
    { label: "Engine", value: "engine" },
    { label: "Transmission", value: "transmission" },
    { label: "Brakes", value: "brakes" },
    { label: "Suspension", value: "suspension" },
    { label: "Electrical", value: "electrical" },
    { label: "Body & Exterior", value: "body" },
    { label: "Interior", value: "interior" },
    { label: "Wheels & Tires", value: "wheels" },
    { label: "Lighting", value: "lighting" },
    { label: "Filters", value: "filters" },
    { label: "Fluids", value: "fluids" },
    { label: "Other", value: "other" },
  ];

  // Vehicle Categories
  const vehicleCategories = [
    { label: "All", value: "all" },
    { label: "Cars", value: "cars", mobileLabel: "Cars" },
    { label: "SUVs", value: "suvs", mobileLabel: "SUVs" },
    { label: "MPVs", value: "mpvs", mobileLabel: "MPVs" },
    { label: "Sports", value: "sports", mobileLabel: "Sports" },
    { label: "Minivan", value: "minivan" },
    { label: "Truck", value: "minitruck", mobileLabel: "Truck" },
    { label: "Passenger", value: "light", mobileLabel: "Passenger" },
    { label: "Pickup", value: "pickup" },
  ];

  return (
    <>
      {/* Main Categories */}
      <div className="mb-2 md:mb-1 flex flex-wrap border-b border-b-[#E6E9F0] bg-white text-base md:text-lg">
        <button
          type="button"
          onClick={() => {
            setCurrentView("imageList");
          }}
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
          onClick={() => {
            setCurrentView("featuredAlbums");
          }}
          className={`relative mr-6 md:mr-10 pb-1 after:absolute after:-bottom-0 after:left-0 after:h-[3px] after:w-full transition-colors font-[600] ${
            currentView === "featuredAlbums"
              ? "text-[var(--primary)] after:bg-[var(--primary)]"
              : "text-[var(--text-primary)] hover:text-[var(--primary)]"
          }`}
        >
          <h2>Car Parts</h2>
        </button>
      </div>

      {/* Brand Filter Section - Different for Vehicles vs Car Parts */}
      {isVehiclesView ? (
        <>
          {/* Vehicles: Full brand filter with letters */}
          <div className="flex w-full flex-col items-start text-xs md:text-sm text-[var(--text-primary)] min-w-0">
            <div className="flex w-full items-center min-w-0">
              <div className="w-12 md:w-14 min-w-[48px] md:min-w-[68px] text-left text-[#828CA0] text-xs md:text-sm shrink-0">
                Brand
              </div>
              {/* Letter filter - hidden on mobile */}
              <ul className="hidden md:flex w-full min-w-0 whitespace-nowrap border-b border-dashed border-b-[#F0F3F8] py-[15px] overflow-x-auto pr-4">
                <li className="relative mr-1 min-w-[40px] h-7 flex-shrink-0 cursor-pointer rounded text-center bg-[#CCEBFF] px-1.5">
                  <button
                    type="button"
                    className="w-full h-full flex items-center justify-center text-xs font-medium"
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
                    className={`relative mr-1 w-7 h-7 flex-shrink-0 cursor-pointer rounded text-center hover:bg-gray-100 ${
                      alphabeticalFilter === letter ? "bg-[#CCEBFF]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full h-full flex items-center justify-center text-xs font-medium"
                      onClick={() => setAlphabeticalFilter(letter)}
                    >
                      {letter}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex w-full items-start border-b border-b-[#F0F3F8] text-xs md:text-sm text-[var(--text-primary)] min-w-0">
              <div className="w-12 md:w-14 min-w-[48px] md:min-w-[68px] shrink-0" aria-hidden="true" />
              <div className="w-full min-w-0 bg-[#F8F9FC] px-2 md:px-4 pb-2 pt-2 md:pt-3 min-h-[60px] md:h-[84px] overflow-x-auto md:overflow-hidden">
                <div className="flex flex-wrap gap-2 md:gap-0">
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
          <div className="flex min-h-7 w-full border-b border-b-[#F0F3F8] py-2 md:py-3 text-xs md:text-sm text-[var(--text-primary)] transition-all min-w-0">
            <div className="w-12 md:w-[68px] leading-5 md:leading-7 text-[#828CA0] text-xs md:text-sm shrink-0">
              Category
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5 md:gap-2 text-xs md:text-sm text-[var(--text-primary)] min-w-0 overflow-x-auto">
              {vehicleCategories.map((type) => (
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

          {/* Quick Filters and Fuel Type Section */}
          <div className="flex min-h-7 w-full border-b border-b-[#F0F3F8] py-2 md:py-3 text-xs md:text-sm text-[var(--text-primary)] transition-all last:border-none min-w-0">
            <div className="w-12 md:w-[68px] leading-5 md:leading-7 text-[#828CA0] text-xs md:text-sm shrink-0">
              Filters
            </div>
            <div className="flex flex-1 flex-wrap gap-2 text-xs md:text-sm text-[var(--text-primary)] min-w-0">
              {/* Quick Filters */}
              <label
                className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border transition-all ${
                  onlyOnSale && !onlyNewEnergy
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                    : "bg-gray-50 border-gray-200 text-[var(--text-secondary)] hover:bg-gray-100 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="quickFilter"
                  checked={onlyOnSale && !onlyNewEnergy}
                  onChange={() => {
                    setOnlyOnSale(true);
                    setOnlyNewEnergy(false);
                  }}
                  className="w-3 h-3 text-[var(--primary)] border-[var(--border)] rounded-full focus:ring-1 focus:ring-[var(--primary)] focus:ring-offset-0 accent-[var(--primary)] cursor-pointer"
                />
                <span className="text-xs font-medium whitespace-nowrap">
                  On Sale
                </span>
              </label>
              <label
                className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border transition-all ${
                  onlyNewEnergy && !onlyOnSale
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                    : "bg-gray-50 border-gray-200 text-[var(--text-secondary)] hover:bg-gray-100 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="quickFilter"
                  checked={onlyNewEnergy && !onlyOnSale}
                  onChange={() => {
                    setOnlyNewEnergy(true);
                    setOnlyOnSale(false);
                  }}
                  className="w-3 h-3 text-[var(--primary)] border-[var(--border)] rounded-full focus:ring-1 focus:ring-[var(--primary)] focus:ring-offset-0 accent-[var(--primary)] cursor-pointer"
                />
                <span className="text-xs font-medium whitespace-nowrap">
                  New Energy
                </span>
              </label>
              
              {/* Fuel Type Filters */}
              {[
                { label: "Gas", value: "gas" as const },
                { label: "Diesel", value: "diesel" as const },
                { label: "Electric", value: "electric" as const },
                { label: "PHEV", value: "phev" as const },
                { label: "Hybrid", value: "hybrid" as const },
                { label: "Hydrogen", value: "hydrogen" as const },
              ].map((type) => (
                <button
                  type="button"
                  key={type.value}
                  onClick={() =>
                    setFuelType(fuelType === type.value ? null : type.value)
                  }
                  className={`px-2.5 py-1 text-xs rounded transition-colors whitespace-nowrap ${
                    fuelType === type.value
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Car Parts: Simplified brand filter (no letters) */}
          <div className="flex w-full flex-col items-start text-xs md:text-sm text-[var(--text-primary)] min-w-0">
            <div className="flex w-full items-start border-b border-b-[#F0F3F8] text-xs md:text-sm text-[var(--text-primary)] min-w-0">
              <div className="w-12 md:w-14 min-w-[48px] md:min-w-[68px] text-left text-[#828CA0] text-xs md:text-sm shrink-0">
                Brand
              </div>
              <div className="w-full min-w-0 bg-[#F8F9FC] px-2 md:px-4 pb-2 pt-2 md:pt-3 min-h-[60px] md:h-[84px] overflow-x-auto md:overflow-hidden">
                <div className="flex flex-wrap gap-2 md:gap-0">
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

          {/* Car Parts Category Filter Section */}
          <div className="flex min-h-7 w-full border-b border-b-[#F0F3F8] py-2 md:py-3 text-xs md:text-sm text-[var(--text-primary)] transition-all min-w-0">
            <div className="w-12 md:w-[68px] leading-5 md:leading-7 text-[#828CA0] text-xs md:text-sm shrink-0">
              Category
            </div>
            <div className="flex flex-1 flex-wrap gap-1.5 md:gap-2 text-xs md:text-sm text-[var(--text-primary)] min-w-0 overflow-x-auto">
              {carPartCategories.map((category) => (
                <button
                  type="button"
                  key={category.value}
                  onClick={() => setCarPartCategory(category.value === "all" ? null : category.value)}
                  className={`cursor-pointer rounded px-2 md:px-1.5 py-1 text-xs whitespace-nowrap transition-colors ${
                    selectedCarPartCategory === category.value || 
                    (category.value === "all" && !selectedCarPartCategory)
                      ? "bg-[var(--primary)] text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <span>{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Car Parts: On Sale Filter */}
          <div className="flex min-h-7 w-full border-b border-b-[#F0F3F8] py-2 md:py-3 text-xs md:text-sm text-[var(--text-primary)] transition-all last:border-none min-w-0">
            <div className="w-12 md:w-[68px] leading-5 md:leading-7 text-[#828CA0] text-xs md:text-sm shrink-0">
              Filters
            </div>
            <div className="flex flex-1 flex-wrap gap-2 text-xs md:text-sm text-[var(--text-primary)] min-w-0">
              <label
                className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-md border transition-all ${
                  onlyOnSale
                    ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                    : "bg-gray-50 border-gray-200 text-[var(--text-secondary)] hover:bg-gray-100 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={onlyOnSale}
                  onChange={(e) => setOnlyOnSale(e.target.checked)}
                  className="w-3 h-3 text-[var(--primary)] border-[var(--border)] rounded focus:ring-1 focus:ring-[var(--primary)] focus:ring-offset-0 accent-[var(--primary)] cursor-pointer"
                />
                <span className="text-xs font-medium whitespace-nowrap">
                  On Sale
                </span>
              </label>
            </div>
          </div>
        </>
      )}
    </>
  );
}
