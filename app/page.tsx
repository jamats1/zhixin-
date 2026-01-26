import Footer from "@/components/Footer";
import Filters from "@/components/Filters";
import Header from "@/components/Header";
import MobileFilters from "@/components/MobileFilters";
import Sidebar from "@/components/Sidebar";
import VehicleGrid from "@/components/VehicleGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex relative">
        {/* Sidebar - hidden on mobile, shown on desktop */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 min-h-screen lg:ml-64">
          <div className="flex flex-col items-stretch py-3 md:py-5 px-3 md:pl-6 md:pr-6">
            <Filters />
            <VehicleGrid />
          </div>
        </main>
      </div>
      {/* Mobile Filter Button/Drawer */}
      <MobileFilters />
      <Footer />
    </div>
  );
}
