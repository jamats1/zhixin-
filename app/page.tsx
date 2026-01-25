import Footer from "@/components/Footer";
import Filters from "@/components/Filters";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import VehicleGrid from "@/components/VehicleGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex relative">
        <Sidebar />
        <main className="flex-1 min-h-screen ml-64">
          <div className="flex flex-1 grow flex-col items-stretch py-5 pr-6">
            <Filters />
            <VehicleGrid />
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
