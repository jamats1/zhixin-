"use client";

import Link from "next/link";
import LocationWeather from "@/components/LocationWeather";
import SearchBar from "@/components/SearchBar";
import { getSiteWhatsAppDigits } from "@/lib/site-whatsapp";

export default function Header() {
  const whatsappHref = `https://wa.me/${getSiteWhatsAppDigits()}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-white shadow-sm">
      <div className="mx-auto flex min-h-[70px] w-full max-w-[1400px] flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2 md:h-[70px] md:flex-nowrap md:gap-3 md:px-6 md:py-0">
        <Link
          href="/"
          className="shrink-0 text-lg tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--primary)] md:text-xl"
        >
          <span className="whitespace-nowrap font-bold">ZHIXIN</span>
        </Link>
        <div className="shrink-0">
          <LocationWeather className="max-w-[min(100%,11rem)] sm:max-w-none" />
        </div>
        <div className="min-w-0 flex-1 basis-[min(100%,12rem)] md:basis-auto">
          <SearchBar />
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center rounded-md bg-[#25D366] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#20BD5A] md:px-4"
          >
            WhatsApp Me
          </a>
        </div>
      </div>
    </header>
  );
}
