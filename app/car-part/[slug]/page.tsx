import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductBreadcrumbs from "@/components/product/ProductBreadcrumbs";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInquiryCTA from "@/components/product/ProductInquiryCTA";
import RelatedProductStrip from "@/components/product/RelatedProductStrip";
import { resolveCarPartPriceRange } from "@/lib/sanity/car-part-price";
import {
  type CarPartDetailDoc,
  fetchCarPartBySlug,
  fetchRelatedCarParts,
  mapCarPartImages,
} from "@/lib/sanity/product-detail";
import {
  breadcrumbJsonLd,
  JsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/json-ld";
import {
  buildCarPartMetaDescription,
  carPartProductJsonLd,
} from "@/lib/seo/product-schema";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site-url";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

function categoryLabel(cat: string): string {
  if (!cat.includes("-") && cat === cat.toLowerCase()) {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  return cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatPartPrice(doc: CarPartDetailDoc): string {
  const pr = resolveCarPartPriceRange(doc);
  if (!pr) return "Request a quote";
  const cur = pr.currency || "USD";
  const sym = cur === "USD" ? "$" : "";
  const suf = cur === "USD" ? "" : ` ${cur}`;
  if (pr.min === pr.max) {
    return `${sym}${pr.min.toLocaleString("en-US")}${suf}`;
  }
  return `${sym}${pr.min.toLocaleString("en-US")} – ${pr.max.toLocaleString("en-US")}${suf}`;
}

function buildTitle(doc: CarPartDetailDoc): string {
  const pn = doc.partNumber?.trim();
  return pn ? `${doc.name} (${pn})` : doc.name;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await fetchCarPartBySlug(decodeURIComponent(slug));
  if (!doc) {
    return { title: "Part not found" };
  }
  const path = `/car-part/${doc.slug}`;
  const canonical = absoluteUrl(path);
  const images = mapCarPartImages(doc);
  const desc = buildCarPartMetaDescription(doc);

  return {
    title: buildTitle(doc),
    description: desc,
    keywords: [
      doc.name,
      doc.partNumber,
      doc.brand,
      doc.category,
      "spare part",
      "auto parts",
      "Zhixin",
    ].filter(Boolean) as string[],
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: "Zhixin",
      title: buildTitle(doc),
      description: desc,
      images: images[0]
        ? [{ url: images[0].url, width: 1200, height: 900, alt: images[0].alt }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: buildTitle(doc),
      description: desc,
      images: images[0] ? [images[0].url] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function CarPartDetailPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const doc = await fetchCarPartBySlug(slug);
  if (!doc) {
    notFound();
  }

  const path = `/car-part/${doc.slug}`;
  const canonical = absoluteUrl(path);
  const siteUrl = getSiteUrl();
  const images = mapCarPartImages(doc);
  const imageUrls = images.map((i) => i.url);

  const related = await fetchRelatedCarParts(doc.slug, doc.category);

  const productLd = carPartProductJsonLd(doc, path, imageUrls);
  const itemListLd =
    related.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Related parts",
          numberOfItems: related.length,
          itemListElement: related.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: absoluteUrl(`/car-part/${r.slug}`),
            name: r.name,
          })),
        }
      : null;

  return (
    <>
      <JsonLd
        data={[
          websiteJsonLd(siteUrl, "Zhixin"),
          organizationJsonLd(siteUrl, "Zhixin"),
          breadcrumbJsonLd([
            { name: "Home", url: siteUrl },
            { name: "Parts", url: `${siteUrl}/` },
            { name: doc.name, url: canonical },
          ]),
          productLd,
          ...(itemListLd ? [itemListLd] : []),
        ]}
      />

      <article className="container mx-auto px-4 py-8 max-w-6xl">
        <ProductBreadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Parts", href: "/" },
            { name: doc.name, href: undefined },
          ]}
        />

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            {doc.name}
          </h1>
          {doc.partNumber && (
            <p className="mt-2 text-gray-600">
              Part number: <span className="font-mono">{doc.partNumber}</span>
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {categoryLabel(doc.category)}
            {doc.brand?.trim() ? ` · ${doc.brand.trim()}` : ""}
            {doc.inStock === false ? " · Out of stock" : ""}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <ProductGallery images={images} priority />
          </div>

          <div className="space-y-6">
            <div className="text-2xl md:text-3xl font-bold text-[var(--primary)]">
              {formatPartPrice(doc)}
            </div>

            <ProductInquiryCTA
              listingTitle={doc.name}
              productPath={path}
              isCarPart
            />

            {doc.description?.trim() && (
              <section aria-labelledby="desc-heading">
                <h2 id="desc-heading" className="text-xl font-bold mb-2">
                  Description
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {doc.description.trim()}
                </div>
              </section>
            )}

            <section aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="text-xl font-bold mb-4">
                Specifications
              </h2>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Category</dt>
                <dd className="font-semibold">{categoryLabel(doc.category)}</dd>
                {doc.specifications?.material && (
                  <>
                    <dt className="text-gray-500">Material</dt>
                    <dd className="font-semibold">
                      {doc.specifications.material}
                    </dd>
                  </>
                )}
                {doc.specifications?.dimensions && (
                  <>
                    <dt className="text-gray-500">Dimensions</dt>
                    <dd className="font-semibold">
                      {doc.specifications.dimensions}
                    </dd>
                  </>
                )}
                {doc.specifications?.weight != null && (
                  <>
                    <dt className="text-gray-500">Weight</dt>
                    <dd className="font-semibold">
                      {doc.specifications.weight} kg
                    </dd>
                  </>
                )}
                {doc.specifications?.warranty != null && (
                  <>
                    <dt className="text-gray-500">Warranty</dt>
                    <dd className="font-semibold">
                      {doc.specifications.warranty} months
                    </dd>
                  </>
                )}
              </dl>
            </section>

            {doc.compatibleVehicles && doc.compatibleVehicles.length > 0 && (
              <section aria-labelledby="fit-heading">
                <h2 id="fit-heading" className="text-xl font-bold mb-4">
                  Compatible vehicles
                </h2>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                  {doc.compatibleVehicles.map((c) => (
                    <li
                      key={`${c.brand ?? ""}-${c.model ?? ""}-${c.yearRange?.from ?? ""}-${c.yearRange?.to ?? ""}`}
                    >
                      {[c.brand, c.model].filter(Boolean).join(" ")}
                      {c.yearRange?.from != null || c.yearRange?.to != null
                        ? ` (${c.yearRange?.from ?? "…"}–${c.yearRange?.to ?? "…"})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <RelatedProductStrip
          heading="Related parts"
          items={related.map((r) => ({
            href: `/car-part/${r.slug}`,
            title: r.name,
            subtitle: r.partNumber || undefined,
            imageUrl: r.imageUrl,
            priceLabel: r.priceLabel,
          }))}
        />
      </article>
    </>
  );
}
