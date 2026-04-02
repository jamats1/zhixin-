import type { Metadata } from "next";
import { Suspense } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import Filters from "@/components/Filters";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileFilters from "@/components/MobileFilters";
import SearchUrlSync from "@/components/SearchUrlSync";
import VehicleGrid from "@/components/VehicleGrid";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Zhixin vehicle inventory by brand, model, and keywords.",
};

export default function SearchPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white overflow-x-hidden w-full">
        <Suspense fallback={null}>
          <SearchUrlSync />
        </Suspense>
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <div className="flex relative w-full overflow-x-hidden">
          <main className="flex-1 min-h-screen w-full max-w-full overflow-x-hidden min-w-0">
            <div className="flex flex-col items-stretch py-3 md:py-5 px-3 md:pl-6 md:pr-4 lg:pr-6 w-full max-w-full overflow-x-hidden">
              <ErrorBoundary>
                <Filters />
              </ErrorBoundary>
              <ErrorBoundary>
                <VehicleGrid />
              </ErrorBoundary>
            </div>
          </main>
        </div>
        <ErrorBoundary>
          <MobileFilters />
        </ErrorBoundary>
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
