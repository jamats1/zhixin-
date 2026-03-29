"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type GalleryImage = { url: string; alt: string };

export default function ProductGallery({
  images,
  priority = false,
}: {
  images: GalleryImage[];
  priority?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const safe = images.length > 0 ? images : [{ url: "", alt: "No image" }];
  const current = safe[Math.min(active, safe.length - 1)];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (safe.length < 2) return;
      setActive((i) => (i + dir + safe.length) % safe.length);
    },
    [safe.length],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, go]);

  if (!images.length || !current.url) {
    return (
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400">
        No image
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        onClick={() => setLightbox(true)}
        aria-label="Open image gallery"
      >
        <Image
          src={current.url}
          alt={current.alt}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority={priority}
        />
      </button>

      {images.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {images.slice(0, 10).map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActive(i)}
              className={`relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 ring-2 ring-transparent focus:outline-none focus-visible:ring-[var(--primary)] ${
                i === active ? "ring-[var(--primary)]" : ""
              }`}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
            >
              <Image
                src={img.url}
                alt=""
                fill
                className="object-cover"
                sizes="120px"
              />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          role="dialog"
          aria-modal
          aria-label="Image gallery"
        >
          <div className="flex justify-end p-4">
            <button
              type="button"
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setLightbox(false)}
              aria-label="Close gallery"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-16 relative min-h-0">
            {images.length > 1 && (
              <button
                type="button"
                className="absolute left-2 md:left-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
                onClick={() => go(-1)}
                aria-label="Previous image"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            )}
            <div className="relative w-full max-w-5xl aspect-[4/3] max-h-[70vh]">
              <Image
                src={current.url}
                alt={current.alt}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
            {images.length > 1 && (
              <button
                type="button"
                className="absolute right-2 md:right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 z-10"
                onClick={() => go(1)}
                aria-label="Next image"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            )}
          </div>
          <p className="text-center text-white/80 text-sm pb-6 px-4">
            {current.alt} ({active + 1} / {images.length})
          </p>
        </div>
      )}
    </div>
  );
}
