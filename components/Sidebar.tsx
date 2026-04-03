"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useBrands } from "@/hooks/useBrands";
import { useCarPartCategories } from "@/hooks/useCarPartCategories";
import { useSparePartLines } from "@/hooks/useSparePartLines";
import { brandLogoUrl } from "@/lib/sanity/client";
import { useFilterStore } from "@/stores/filterStore";
import { useUIStore } from "@/stores/uiStore";
import type { BrandWithLogo } from "@/types";

function BrandLogo({
  brand,
  size = 32,
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
        unoptimized={process.env.NODE_ENV !== "production"}
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

export default function Sidebar() {
  const { currentView } = useUIStore();
  const isVehiclesView =
    currentView === "imageList" || currentView === "truckList";
  const isCarPartsView = currentView === "featuredAlbums";

  const {
    onlyOnSale,
    onlyNewEnergy,
    fuelType,
    setOnlyOnSale,
    setOnlyNewEnergy,
    setFuelType,
    setBrand,
    setSparePartLine,
    alphabeticalFilter,
    setAlphabeticalFilter,
    selectedBrand,
    selectedSparePartLineId,
    selectedCarPartCategory,
    setCarPartCategory,
  } = useFilterStore();
  const { brands, isLoading } = useBrands({
    countSource: isVehiclesView ? "vehicles" : "carParts",
  });
  const { categories: carPartCategories } = useCarPartCategories();
  const { lines: sparePartLines, isLoading: spareLinesLoading } =
    useSparePartLines(isCarPartsView ? selectedBrand : null);
  const expandedLetter = alphabeticalFilter ?? "A";

  const brandsByLetter = useMemo(() => {
    const acc: Record<string, BrandWithLogo[]> = {};
    for (const b of brands) {
      const letter = b.name[0]?.toUpperCase() ?? "#";
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(b);
    }
    return acc;
  }, [brands]);

  const letters = Array.from({ length: 26 }, (_, i) =>
    String.fromCharCode(65 + i),
  );

  const handleLetterClick = (letter: string) => {
    setAlphabeticalFilter(letter);
  };

  return (
    <aside className="w-64 bg-white border-r border-[var(--border)] sticky top-[70px] self-start max-h-[calc(100vh-70px)] overflow-y-auto overflow-x-hidden shadow-sm z-40">
      <div className="p-4 space-y-4">
        {isVehiclesView ? (
          <>
            {/* Vehicles: Quick Filters */}
            <div className="flex gap-2">
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
            </div>

            {/* Vehicles: Fuel Type Filters */}
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 px-1 uppercase tracking-wide">
                Fuel Type
              </div>
              <div className="flex flex-wrap gap-2">
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
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${
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

            {/* Vehicles: Filter by Letter */}
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 px-1 uppercase tracking-wide">
                Filter by Letter
              </div>
              <div className="grid grid-cols-6 gap-1">
                {letters.map((letter) => (
                  <button
                    type="button"
                    key={letter}
                    onClick={() => handleLetterClick(letter)}
                    className={`px-2 py-1 text-xs text-center rounded hover:bg-gray-100 transition-colors ${
                      alphabeticalFilter === letter
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicles: Brands by Letter */}
            <div className="space-y-1">
              {isLoading ? (
                <p className="text-sm text-[var(--text-tertiary)] px-2 py-4 text-center">
                  Loading brands...
                </p>
              ) : (
                letters.map((letter) => (
                  <div
                    key={letter}
                    className={expandedLetter === letter ? "block" : "hidden"}
                  >
                    <div className="font-semibold text-sm text-[var(--text-primary)] mb-2 px-2 py-1 bg-gray-50 rounded">
                      {letter}
                    </div>
                    {(brandsByLetter[letter] ?? []).length === 0 ? (
                      <p className="px-2 py-1.5 text-sm text-[var(--text-tertiary)]">
                        No brands
                      </p>
                    ) : (
                      (brandsByLetter[letter] ?? []).map((brand) => (
                        <button
                          type="button"
                          key={brand.id}
                          onClick={() => setBrand(brand.id)}
                          className="w-full text-left px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-gray-50 rounded flex items-center gap-2 justify-between group"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <BrandLogo brand={brand} size={24} />
                            <span className="truncate">{brand.name}</span>
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)] shrink-0 group-hover:text-[var(--primary)]">
                            ({brand.count})
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* Car Parts: On Sale Filter */}
            <div>
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

            {/* Car Parts: Category Filters */}
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 px-1 uppercase tracking-wide">
                Category
              </div>
              <div className="flex flex-col gap-1.5">
                {carPartCategories.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() =>
                      setCarPartCategory(
                        category.id === "all" ? null : category.id,
                      )
                    }
                    className={`px-2.5 py-1.5 text-xs text-left rounded transition-colors ${
                      selectedCarPartCategory === category.id ||
                      (category.id === "all" && !selectedCarPartCategory)
                        ? "bg-[var(--primary)] text-white"
                        : "bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200"
                    }`}
                  >
                    {category.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Car Parts: Brands (Simplified - no letter filter) */}
            <div>
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 px-1 uppercase tracking-wide">
                Brands
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <p className="text-sm text-[var(--text-tertiary)] px-2 py-4 text-center">
                    Loading brands...
                  </p>
                ) : brands.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-[var(--text-tertiary)]">
                    No brands
                  </p>
                ) : (
                  brands.map((brand) => (
                    <button
                      type="button"
                      key={brand.id}
                      onClick={() =>
                        setBrand(selectedBrand === brand.id ? null : brand.id)
                      }
                      className={`w-full text-left px-2 py-1.5 text-sm rounded flex items-center gap-2 justify-between group transition-colors ${
                        selectedBrand === brand.id
                          ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <BrandLogo brand={brand} size={20} />
                        <span className="truncate">{brand.name}</span>
                      </span>
                      <span
                        className={`text-xs shrink-0 ${
                          selectedBrand === brand.id
                            ? "text-[var(--primary)]"
                            : "text-[var(--text-tertiary)] group-hover:text-[var(--primary)]"
                        }`}
                      >
                        ({brand.count})
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedBrand && (
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mb-2 px-1 uppercase tracking-wide">
                  Model line
                </div>
                <div className="space-y-1 max-h-[220px] overflow-y-auto">
                  {spareLinesLoading ? (
                    <p className="text-sm text-[var(--text-tertiary)] px-2 py-2">
                      Loading lines…
                    </p>
                  ) : sparePartLines.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-[var(--text-tertiary)]">
                      No model lines yet (run BD Spares ingest).
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setSparePartLine(null)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                          !selectedSparePartLineId
                            ? "bg-[var(--primary)] text-white"
                            : "bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200"
                        }`}
                      >
                        All lines
                      </button>
                      {sparePartLines.map((line) => (
                        <button
                          type="button"
                          key={line.id}
                          onClick={() =>
                            setSparePartLine(
                              selectedSparePartLineId === line.id
                                ? null
                                : line.id,
                            )
                          }
                          className={`w-full text-left px-2 py-1.5 text-xs rounded truncate transition-colors ${
                            selectedSparePartLineId === line.id
                              ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                              : "text-[var(--text-secondary)] hover:bg-gray-50"
                          }`}
                        >
                          {line.title}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
