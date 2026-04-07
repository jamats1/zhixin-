"use client";

import { X } from "lucide-react";
import { useSparePartLines } from "@/hooks/useSparePartLines";
import { useVehicleTypesForFilters } from "@/hooks/useVehicleTypesForFilters";
import { useFilterStore } from "@/stores/filterStore";
import { useUIStore } from "@/stores/uiStore";

export default function MobileFilters() {
  const { isSidebarOpen, setSidebarOpen, currentView } = useUIStore();
  const {
    onlyOnSale,
    onlyNewEnergy,
    fuelType,
    selectedCategory,
    selectedType,
    setType,
    selectedBrand,
    selectedSparePartLineId,
    setSparePartLine,
    setOnlyOnSale,
    setOnlyNewEnergy,
    setFuelType,
  } = useFilterStore();
  const isVehiclesView =
    currentView === "imageList" || currentView === "truckList";
  const isCarPartsView = currentView === "featuredAlbums";
  const { types: vehicleTypesForRow, showRow: showVehicleTypeRow } =
    useVehicleTypesForFilters(selectedCategory);
  const { lines: sparePartLines, isLoading: spareLinesLoading } =
    useSparePartLines(isCarPartsView ? selectedBrand : null);

  if (!isSidebarOpen) {
    return (
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed right-4 z-40 bg-[var(--primary)] text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[var(--primary-hover)] transition-all flex items-center gap-2 text-sm font-medium bottom-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
          focusable="false"
        >
          <title>Filters</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filters
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        className="md:hidden fixed inset-0 z-40 cursor-default border-0 bg-black/50 p-0"
        aria-label="Close filters"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Filter Drawer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-center pt-3">
          <div
            className="w-10 h-1.5 rounded-full bg-gray-300"
            aria-hidden="true"
          />
        </div>
        <div className="sticky top-0 bg-white border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Filters
          </h3>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close filters"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {isVehiclesView ? (
            <>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  Availability
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-2.5 rounded-md border transition-all text-center ${
                      !onlyOnSale && !onlyNewEnergy
                        ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                        : "bg-gray-50 border-gray-200 text-[var(--text-secondary)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mobileQuickFilter"
                      checked={!onlyOnSale && !onlyNewEnergy}
                      onChange={() => {
                        setOnlyOnSale(false);
                        setOnlyNewEnergy(false);
                      }}
                      className="sr-only"
                    />
                    <span className="text-xs font-medium">All</span>
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-2.5 rounded-md border transition-all text-center ${
                      onlyOnSale && !onlyNewEnergy
                        ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                        : "bg-gray-50 border-gray-200 text-[var(--text-secondary)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mobileQuickFilter"
                      checked={onlyOnSale && !onlyNewEnergy}
                      onChange={() => {
                        setOnlyOnSale(true);
                        setOnlyNewEnergy(false);
                      }}
                      className="sr-only"
                    />
                    <span className="text-xs font-medium">On sale</span>
                  </label>
                  <label
                    className={`flex items-center justify-center gap-2 cursor-pointer px-2 py-2.5 rounded-md border transition-all text-center ${
                      onlyNewEnergy && !onlyOnSale
                        ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                        : "bg-gray-50 border-gray-200 text-[var(--text-secondary)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="mobileQuickFilter"
                      checked={onlyNewEnergy && !onlyOnSale}
                      onChange={() => {
                        setOnlyNewEnergy(true);
                        setOnlyOnSale(false);
                      }}
                      className="sr-only"
                    />
                    <span className="text-xs font-medium">New energy</span>
                  </label>
                </div>
              </div>

              {showVehicleTypeRow ? (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Body type
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {vehicleTypesForRow.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setType(t.id === "all" ? null : t.id)}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                          (t.id === "all" && !selectedType) ||
                          selectedType === t.id
                            ? "bg-[var(--primary)] text-white"
                            : "bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200"
                        }`}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  Fuel type
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFuelType(null)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      fuelType == null
                        ? "bg-[var(--primary)] text-white"
                        : "bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200"
                    }`}
                  >
                    Any fuel
                  </button>
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
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
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
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  Parts filters
                </h4>
                <label
                  className={`flex items-center gap-3 cursor-pointer px-3 py-3 rounded-md border transition-all ${
                    onlyOnSale
                      ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]"
                      : "bg-gray-50 border-gray-200 text-[var(--text-secondary)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={onlyOnSale}
                    onChange={(e) => setOnlyOnSale(e.target.checked)}
                    className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="text-sm font-medium">On sale only</span>
                </label>
              </div>

              {selectedBrand ? (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                    Model line
                  </h4>
                  {spareLinesLoading ? (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Loading lines…
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSparePartLine(null)}
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
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
                          onClick={() => setSparePartLine(line.id)}
                          className={`px-3 py-1.5 text-sm rounded-md transition-colors max-w-full truncate ${
                            selectedSparePartLineId === line.id
                              ? "bg-[var(--primary)] text-white"
                              : "bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200"
                          }`}
                        >
                          {line.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
