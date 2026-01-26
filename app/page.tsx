import ErrorBoundary from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import Filters from "@/components/Filters";
import Header from "@/components/Header";
import MobileFilters from "@/components/MobileFilters";
import Sidebar from "@/components/Sidebar";
import VehicleGrid from "@/components/VehicleGrid";

export default function Home() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white overflow-x-hidden w-full">
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <div className="flex relative w-full overflow-x-hidden">
          {/* Sidebar - hidden on mobile, shown on desktop */}
          <div className="hidden lg:block shrink-0">
            <ErrorBoundary>
              <Sidebar />
            </ErrorBoundary>
          </div>
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
        {/* Mobile Filter Button/Drawer */}
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
