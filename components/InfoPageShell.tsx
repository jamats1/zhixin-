import type { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function InfoPageShell({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white overflow-x-hidden w-full flex flex-col">
        <ErrorBoundary>
          <Header />
        </ErrorBoundary>
        <main className="flex-1 w-full max-w-[800px] mx-auto px-4 py-8 md:py-12">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-6">
            {title}
          </h1>
          <div className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed space-y-4">
            {children}
          </div>
        </main>
        <ErrorBoundary>
          <Footer />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}
