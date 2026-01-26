"use client";

import { X } from "lucide-react";
import { useFilterStore } from "@/stores/filterStore";
import { useUIStore } from "@/stores/uiStore";

export default function MobileFilters() {
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  const {
    onlyOnSale,
    onlyNewEnergy,
    fuelType,
    setOnlyOnSale,
    setOnlyNewEnergy,
    setFuelType,
  } = useFilterStore();

  if (!isSidebarOpen) {
    return (
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-[var(--primary)] text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-[var(--primary-hover)] transition-all flex items-center gap-2 text-sm font-medium"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
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
      <div
        className="lg:hidden fixed inset-0 bg-black/50 z-40"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Filter Drawer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto">
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
          {/* Quick Filters */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Quick Filters
            </h4>
            <div className="flex gap-2">
              <label
                className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border transition-all flex-1 justify-center ${
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
                  className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded-full accent-[var(--primary)] cursor-pointer"
                />
                <span className="text-sm font-medium">On Sale</span>
              </label>
              <label
                className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border transition-all flex-1 justify-center ${
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
                  className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded-full accent-[var(--primary)] cursor-pointer"
                />
                <span className="text-sm font-medium">New Energy</span>
              </label>
            </div>
          </div>

          {/* Fuel Type */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Fuel Type
            </h4>
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
        </div>
      </div>
    </>
  );
}
