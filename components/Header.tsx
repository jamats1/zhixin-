"use client";

import Link from "next/link";
import SearchBar from "./SearchBar";

export default function Header() {
  return (
    <header className="bg-white border-b border-[var(--border)] sticky top-0 z-50">
      {/* Top Bar */}
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-[var(--primary)]">
          ZHIXIN车
        </Link>

        {/* Location/Date - placeholder */}
        <div className="text-sm text-[var(--text-secondary)]">
          <span>New York</span>
          <span className="mx-2">•</span>
          <span>Today</span>
        </div>

        {/* Modern Search Bar with Suggestions */}
        <SearchBar />

        {/* User Actions */}
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            className="px-5 py-2 bg-[var(--primary)] text-white rounded-md font-medium hover:bg-[var(--primary-hover)] transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/30 active:scale-[0.98]"
          >
            Sign Up
          </button>
          <button
            type="button"
            className="px-5 py-2 text-[var(--primary)] border border-[var(--primary)] rounded-md font-medium hover:bg-[var(--primary)] hover:text-white transition-all duration-200 hover:shadow-md hover:shadow-[var(--primary)]/20 active:scale-[0.98]"
          >
            Login
          </button>
        </div>
      </div>
    </header>
  );
}
