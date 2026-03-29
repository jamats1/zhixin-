import ErrorBoundary from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function CarPartSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white overflow-x-hidden w-full flex flex-col">
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <div className="flex-1 w-full max-w-full overflow-x-hidden min-w-0">
          {children}
        </div>
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
