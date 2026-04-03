"use client";

import Image from "next/image";
import Link from "next/link";
import LocationWeather from "@/components/LocationWeather";
import SearchBar from "@/components/SearchBar";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-white shadow-sm">
      <div className="mx-auto flex min-h-[70px] w-full max-w-[1400px] flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 md:h-[70px] md:flex-nowrap md:gap-3 md:px-6 md:py-0">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--primary)] md:text-xl"
        >
          <Image
            src="/icon.svg"
            alt=""
            width={36}
            height={36}
            className="size-8 shrink-0 rounded-md md:size-9"
            unoptimized
          />
          <span className="whitespace-nowrap">Zhixin车</span>
        </Link>
        <div className="min-w-0 flex-1 basis-[min(100%,12rem)] md:basis-auto">
          <SearchBar />
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <LocationWeather className="max-w-[min(100%,11rem)] sm:max-w-none" />
          <Link
            href="/inquiry"
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-md bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] md:px-4"
          >
            Inquiry
          </Link>
        </div>
      </div>
    </header>
  );
}
