"use client";

import Link from "next/link";
import LocationWeather from "./LocationWeather";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50 w-full left-0 right-0 overflow-x-hidden pt-[env(safe-area-inset-top)]">
      {/* Top Bar */}
      <div className="max-w-[1400px] mx-auto px-3 md:px-4 md:pr-6 py-2 md:py-3 flex items-center justify-between gap-2 md:gap-4 w-full overflow-x-hidden min-h-[44px]">
        {/* Logo */}
        <Link href="/" className="shrink-0 text-xl md:text-2xl text-[var(--primary)]">
          <span className="font-bold">ZHI</span>
          <span className="font-light">XIN</span>
          <span className="font-bold">车</span>
        </Link>

        {/* Location/Weather — hidden on mobile */}
        <div className="hidden lg:block">
          <LocationWeather />
        </div>

        {/* Modern Search Bar with Suggestions */}
        <div className="flex-1 max-w-md lg:max-w-lg">
          <SearchBar />
        </div>

        {/* User Actions — hidden on mobile */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          <button
            type="button"
            className="px-4 md:px-5 py-1.5 md:py-2 min-h-[44px] bg-[var(--primary)] text-white rounded-md text-xs md:text-sm font-medium hover:bg-[var(--primary-hover)] transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/30 active:scale-[0.98]"
          >
            Sign Up
          </button>
          <button
            type="button"
            className="px-4 md:px-5 py-1.5 md:py-2 min-h-[44px] text-[var(--primary)] border border-[var(--primary)] rounded-md text-xs md:text-sm font-medium hover:bg-[var(--primary)] hover:text-white transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/20 active:scale-[0.98]"
          >
            Login
          </button>
        </div>
      </div>
    </header>
  );
}
