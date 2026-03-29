import Link from "next/link";

export type BreadcrumbItem = {
  name: string;
  href?: string;
};

export default function ProductBreadcrumbs({
  items,
}: {
  items: BreadcrumbItem[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-sm text-[var(--text-tertiary)] mb-6"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-gray-300" aria-hidden>
                /
              </span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-[var(--primary)] transition-colors underline-offset-2 hover:underline"
              >
                {item.name}
              </Link>
            ) : (
              <span className="text-[var(--text-primary)] font-medium">
                {item.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
