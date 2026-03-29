import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductBreadcrumbs from "@/components/product/ProductBreadcrumbs";
import ProductGallery from "@/components/product/ProductGallery";
import ProductInquiryCTA from "@/components/product/ProductInquiryCTA";
import RelatedProductStrip from "@/components/product/RelatedProductStrip";
import {
  fetchRelatedVehicles,
  fetchVehicleBySlug,
  mapVehicleImages,
  type VehicleDetailDoc,
} from "@/lib/sanity/product-detail";
import {
  breadcrumbJsonLd,
  JsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo/json-ld";
import {
  buildVehicleMetaDescription,
  vehicleProductJsonLd,
} from "@/lib/seo/product-schema";
import { absoluteUrl, getSiteUrl } from "@/lib/seo/site-url";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

function buildTitle(doc: VehicleDetailDoc): string {
  const brand = doc.brand?.title?.trim();
  const model = doc.model?.trim();
  const bit =
    brand && model && model.toLowerCase() !== brand.toLowerCase()
      ? `${brand} ${model}`
      : brand || model || doc.title;
  return `${bit} — ${doc.title}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = await fetchVehicleBySlug(decodeURIComponent(slug));
  if (!doc) {
    return { title: "Vehicle not found" };
  }
  const path = `/vehicle/${doc.slug}`;
  const canonical = absoluteUrl(path);
  const images = mapVehicleImages(doc);
  const desc = buildVehicleMetaDescription(doc);

  return {
    title: buildTitle(doc),
    description: desc,
    keywords: [
      doc.brand?.title,
      doc.model,
      doc.category?.title,
      doc.type?.title,
      doc.fuelType,
      "vehicle",
      "export",
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

export default async function VehicleDetailPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);
  const doc = await fetchVehicleBySlug(slug);
  if (!doc) {
    notFound();
  }

  const path = `/vehicle/${doc.slug}`;
  const canonical = absoluteUrl(path);
  const siteUrl = getSiteUrl();
  const images = mapVehicleImages(doc);
  const imageUrls = images.map((i) => i.url);

  const related = await fetchRelatedVehicles(
    doc.slug,
    doc.brand?._id,
    doc.category?._id,
  );

  const brandLabel = doc.brand?.title?.trim();
  const modelLabel = doc.model?.trim();
  const headline =
    brandLabel &&
    modelLabel &&
    modelLabel.toLowerCase() !== brandLabel.toLowerCase()
      ? `${brandLabel} ${modelLabel}`
      : doc.title;

  const productLd = vehicleProductJsonLd(doc, path, imageUrls);
  const itemListLd =
    related.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Related vehicles",
          numberOfItems: related.length,
          itemListElement: related.map((r, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: absoluteUrl(`/vehicle/${r.slug}`),
            name: r.title,
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
            { name: "Vehicles", url: `${siteUrl}/` },
            { name: doc.title, url: canonical },
          ]),
          productLd,
          ...(itemListLd ? [itemListLd] : []),
        ]}
      />

      <article className="container mx-auto px-4 py-8 max-w-6xl">
        <ProductBreadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Vehicles", href: "/" },
            { name: doc.title, href: undefined },
          ]}
        />

        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            {headline}
          </h1>
          {doc.tagline?.trim() && (
            <p className="mt-2 text-lg text-gray-600">{doc.tagline}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {[doc.category?.title, doc.type?.title].filter(Boolean).join(" · ")}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <ProductGallery images={images} priority />
          </div>

          <div className="space-y-6">
            <div className="text-4xl font-bold text-[var(--primary)]">
              {doc.price != null && doc.price > 0
                ? `$${doc.price.toLocaleString("en-US")}`
                : "Inquire for price"}
            </div>

            <ProductInquiryCTA
              listingTitle={doc.title}
              productPath={path}
              isCarPart={false}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-y border-gray-100 py-6">
              {[
                ["Reg. year", doc.registrationYear || "—"],
                [
                  "Mileage",
                  doc.mileage != null
                    ? `${doc.mileage.toLocaleString("en-US")} km`
                    : "—",
                ],
                ["Fuel", doc.fuelType || "—"],
                ["Engine", doc.engineDisplacement || "—"],
                ["Transmission", doc.transmission || "—"],
                ["Drivetrain", doc.drivetrain || "—"],
              ].map(([label, val]) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase">{label}</p>
                  <p className="text-base font-semibold text-gray-900">{val}</p>
                </div>
              ))}
            </div>

            <section aria-labelledby="specs-heading">
              <h2 id="specs-heading" className="text-xl font-bold mb-4">
                Technical specifications
              </h2>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Body type</dt>
                <dd className="font-semibold">{doc.bodyType || "—"}</dd>
                <dt className="text-gray-500">Seats</dt>
                <dd className="font-semibold">{doc.seats ?? "—"}</dd>
                <dt className="text-gray-500">Doors</dt>
                <dd className="font-semibold">{doc.doors ?? "—"}</dd>
                <dt className="text-gray-500">Weight</dt>
                <dd className="font-semibold">
                  {doc.weightKg != null ? `${doc.weightKg} kg` : "—"}
                </dd>
                {doc.isNewEnergy ||
                ["BEV", "PHEV", "Electric"].some((x) =>
                  doc.fuelType?.toUpperCase().includes(x),
                ) ? (
                  <>
                    <dt className="text-gray-500">Battery</dt>
                    <dd className="font-semibold">
                      {doc.batteryCapacityKwh != null
                        ? `${doc.batteryCapacityKwh} kWh`
                        : "—"}
                    </dd>
                    <dt className="text-gray-500">Range (NEDC / stated)</dt>
                    <dd className="font-semibold">
                      {doc.rangeKm != null ? `${doc.rangeKm} km` : "—"}
                    </dd>
                  </>
                ) : null}
                <dt className="text-gray-500">SKU</dt>
                <dd className="font-semibold">{doc.sku || "—"}</dd>
              </dl>
            </section>

            {doc.features && doc.features.length > 0 && (
              <section aria-labelledby="features-heading">
                <h2 id="features-heading" className="text-xl font-bold mb-4">
                  Features
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {doc.features.map((feature) => (
                    <li key={feature}>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        <RelatedProductStrip
          heading="Related vehicles"
          items={related.map((r) => ({
            href: `/vehicle/${r.slug}`,
            title: r.title,
            subtitle: r.brandTitle || undefined,
            imageUrl: r.imageUrl,
            priceLabel: r.priceLabel,
          }))}
        />
      </article>
    </>
  );
}
