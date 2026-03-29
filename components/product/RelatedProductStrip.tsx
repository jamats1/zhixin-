import Image from "next/image";
import Link from "next/link";

export type RelatedItem = {
  href: string;
  title: string;
  subtitle?: string;
  imageUrl: string | null;
  priceLabel: string | null;
};

export default function RelatedProductStrip({
  heading,
  items,
}: {
  heading: string;
  items: RelatedItem[];
}) {
  if (!items.length) return null;

  return (
    <section
      className="mt-16 pt-12 border-t border-[var(--border)]"
      aria-labelledby="related-heading"
    >
      <h2
        id="related-heading"
        className="text-xl font-bold text-[var(--text-primary)] mb-6"
      >
        {heading}
      </h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group block bg-white rounded-lg border border-[var(--border)] overflow-hidden hover:shadow-md hover:border-[var(--primary)]/40 transition-all"
            >
              <div className="relative aspect-[4/3] bg-gray-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition-transform"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                    No image
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--primary)]">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">
                    {item.subtitle}
                  </p>
                )}
                {item.priceLabel && (
                  <p className="text-sm font-semibold text-blue-600 mt-2">
                    {item.priceLabel}
                  </p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
