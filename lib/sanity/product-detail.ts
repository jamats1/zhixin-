import { groq } from "next-sanity";
import { resolveCarPartPriceRange } from "@/lib/sanity/car-part-price";
import client, { urlFor } from "@/lib/sanity/client";

const vehicleBySlugQuery = groq`
  *[_type == "vehicle" && slug.current == $slug][0] {
    _id,
    _updatedAt,
    title,
    "slug": slug.current,
    tagline,
    brand->{ _id, title, "slug": slug.current, logo },
    model,
    year,
    registrationYear,
    mileage,
    fuelType,
    engineDisplacement,
    transmission,
    price,
    sku,
    priceRange,
    images,
    category->{ _id, title, "slug": slug.current },
    type->{ _id, title, "slug": slug.current },
    bodyType,
    seats,
    doors,
    weightKg,
    batteryCapacityKwh,
    rangeKm,
    drivetrain,
    features,
    isOnSale,
    isNewEnergy,
    vehicleSegment
  }
`;

const vehicleSlugByIdQuery = groq`
  *[_type == "vehicle" && _id == $id][0]{ "slug": slug.current }
`;

function relatedVehiclesGroq(
  brandRef: string | undefined,
  categoryRef: string | undefined,
) {
  const conditions = [
    '_type == "vehicle"',
    "defined(slug.current)",
    "slug.current != $slug",
  ];
  if (brandRef) {
    conditions.push("brand._ref == $brandRef");
  } else if (categoryRef) {
    conditions.push("category._ref == $catRef");
  } else {
    conditions.push("false");
  }
  return groq`
    *[${conditions.join(" && ")}]
      | order(_updatedAt desc) [0...8] {
      _id,
      title,
      "slug": slug.current,
      images[0],
      brand->{ title },
      price,
      priceRange
    }
  `;
}

const carPartBySlugQuery = groq`
  *[_type == "carPart" && slug.current == $slug][0] {
    _id,
    _updatedAt,
    name,
    partNumber,
    "category": category->{ _id, title, "slug": slug.current, sourceKey },
    "brand": brand->{ _id, title, "slug": slug.current, logo },
    gallery[]{ alt, image { asset-> } },
    priceRange,
    priceZar,
    exchangeRateZarUsd,
    specifications,
    description,
    isOnSale,
    inStock,
    "slug": slug.current,
    publishedAt,
    compatibleVehicles
  }
`;

const carPartSlugByIdQuery = groq`
  *[_type == "carPart" && _id == $id][0]{ "slug": slug.current }
`;

const relatedCarPartsQuery = groq`
  *[
    _type == "carPart"
    && defined(slug.current)
    && slug.current != $slug
    && category._ref == $categoryId
    && inStock == true
  ]
    | order(publishedAt desc) [0...8] {
    _id,
    name,
    partNumber,
    "slug": slug.current,
    gallery[]{ alt, image { asset-> } },
    priceRange,
    priceZar,
    exchangeRateZarUsd
  }
`;

const sitemapVehiclesQuery = groq`
  *[_type == "vehicle" && defined(slug.current)]{
    "slug": slug.current,
    _updatedAt
  }
`;

const sitemapCarPartsQuery = groq`
  *[_type == "carPart" && defined(slug.current)]{
    "slug": slug.current,
    _updatedAt
  }
`;

export type VehicleDetailDoc = {
  _id: string;
  _updatedAt?: string;
  title: string;
  slug: string;
  tagline?: string;
  brand?: {
    _id: string;
    title?: string;
    slug?: string;
    logo?: unknown;
  };
  model?: string;
  year?: number;
  registrationYear?: string;
  mileage?: number;
  fuelType?: string;
  engineDisplacement?: string;
  transmission?: string;
  price?: number;
  sku?: string;
  priceRange?: { min?: number; max?: number; currency?: string };
  images?: unknown[];
  category?: { _id: string; title?: string; slug?: string };
  type?: { _id: string; title?: string; slug?: string };
  bodyType?: string;
  seats?: number;
  doors?: number;
  weightKg?: number;
  batteryCapacityKwh?: number;
  rangeKm?: number;
  drivetrain?: string;
  features?: string[];
  isOnSale?: boolean;
  isNewEnergy?: boolean;
  vehicleSegment?: string;
};

export type RelatedVehicleCard = {
  _id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  brandTitle?: string;
  priceLabel: string | null;
};

export type CarPartDetailDoc = {
  _id: string;
  _updatedAt?: string;
  name: string;
  partNumber?: string;
  category?: { _id: string; title?: string; slug?: string; sourceKey?: string };
  brand?: { _id: string; title?: string; slug?: string; logo?: unknown };
  gallery?: Array<{ alt?: string; image?: { asset?: unknown } }>;
  priceRange?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  priceZar?: number;
  exchangeRateZarUsd?: number;
  specifications?: {
    material?: string;
    dimensions?: string;
    weight?: number;
    warranty?: number;
  };
  description?: string;
  isOnSale?: boolean;
  inStock?: boolean;
  slug: string;
  publishedAt?: string;
  compatibleVehicles?: Array<{
    brand?: string;
    model?: string;
    yearRange?: { from?: number; to?: number };
  }>;
};

export type RelatedCarPartCard = {
  _id: string;
  name: string;
  slug: string;
  partNumber?: string;
  imageUrl: string | null;
  priceLabel: string | null;
};

function formatPriceRange(pr?: {
  min?: number;
  max?: number;
  currency?: string;
}): string | null {
  if (!pr || pr.min == null || pr.max == null) return null;
  const cur = pr.currency || "USD";
  if (cur === "USD") {
    if (pr.min === pr.max) return `$${pr.min.toLocaleString("en-US")}`;
    return `$${pr.min.toLocaleString("en-US")} – $${pr.max.toLocaleString("en-US")}`;
  }
  if (pr.min === pr.max) return `${pr.min} ${cur}`;
  return `${pr.min} – ${pr.max} ${cur}`;
}

function vehicleImageUrl(img: unknown): string | null {
  if (!img) return null;
  try {
    return urlFor(img as Parameters<typeof urlFor>[0])
      .width(1200)
      .quality(80)
      .url();
  } catch {
    return null;
  }
}

export async function fetchVehicleBySlug(
  slug: string,
): Promise<VehicleDetailDoc | null> {
  if (!client) return null;
  return client.fetch<VehicleDetailDoc | null>(vehicleBySlugQuery, { slug });
}

export async function fetchVehicleSlugById(id: string): Promise<string | null> {
  if (!client) return null;
  const row = await client.fetch<{ slug: string | null } | null>(
    vehicleSlugByIdQuery,
    { id },
  );
  return row?.slug ?? null;
}

export async function fetchRelatedVehicles(
  slug: string,
  brandRef: string | undefined,
  categoryRef: string | undefined,
): Promise<RelatedVehicleCard[]> {
  if (!client) return [];
  const q = relatedVehiclesGroq(brandRef, categoryRef);
  const params: Record<string, string> = { slug };
  if (brandRef) params.brandRef = brandRef;
  if (categoryRef) params.catRef = categoryRef;

  const rows = await client.fetch<
    Array<{
      _id: string;
      title: string;
      slug: string;
      images?: unknown[];
      brand?: { title?: string };
      price?: number;
      priceRange?: { min?: number; max?: number; currency?: string };
    }>
  >(q, params);
  return rows.map((r) => ({
    _id: r._id,
    title: r.title,
    slug: r.slug,
    imageUrl: r.images?.[0] ? vehicleImageUrl(r.images[0]) : null,
    brandTitle: r.brand?.title,
    priceLabel:
      r.price != null
        ? `$${r.price.toLocaleString("en-US")}`
        : formatPriceRange(r.priceRange),
  }));
}

export async function fetchCarPartBySlug(
  slug: string,
): Promise<CarPartDetailDoc | null> {
  if (!client) return null;
  return client.fetch<CarPartDetailDoc | null>(carPartBySlugQuery, { slug });
}

export async function fetchCarPartSlugById(id: string): Promise<string | null> {
  if (!client) return null;
  const row = await client.fetch<{ slug: string | null } | null>(
    carPartSlugByIdQuery,
    { id },
  );
  return row?.slug ?? null;
}

export async function fetchRelatedCarParts(
  slug: string,
  categoryId: string,
): Promise<RelatedCarPartCard[]> {
  if (!client) return [];
  const rows = await client.fetch<
    Array<{
      _id: string;
      name: string;
      slug: string;
      partNumber?: string;
      gallery?: Array<{ alt?: string; image?: { asset?: unknown } }>;
      priceRange?: { min?: number; max?: number; currency?: string };
      priceZar?: number;
      exchangeRateZarUsd?: number;
    }>
  >(relatedCarPartsQuery, { slug, categoryId });
  return rows.map((r) => {
    const first = r.gallery?.[0]?.image;
    const resolved = resolveCarPartPriceRange({
      priceRange: r.priceRange,
      priceZar: r.priceZar,
      exchangeRateZarUsd: r.exchangeRateZarUsd,
    });
    return {
      _id: r._id,
      name: r.name,
      slug: r.slug,
      partNumber: r.partNumber,
      imageUrl: first ? vehicleImageUrl(first) : null,
      priceLabel: formatPriceRange(resolved),
    };
  });
}

/** Gallery URLs for vehicle detail page */
export function mapVehicleImages(doc: VehicleDetailDoc): Array<{
  url: string;
  alt: string;
}> {
  const title = doc.title || "Vehicle";
  if (!doc.images?.length) return [];
  return doc.images
    .map((img, i) => {
      const url = vehicleImageUrl(img);
      if (!url) return null;
      return { url, alt: `${title} — image ${i + 1}` };
    })
    .filter((x): x is { url: string; alt: string } => x != null);
}

export function mapCarPartImages(doc: CarPartDetailDoc): Array<{
  url: string;
  alt: string;
}> {
  const name = doc.name || "Part";
  if (!doc.gallery?.length) return [];
  return doc.gallery
    .map((g, i) => {
      const src = g.image;
      if (!src) return null;
      const url = vehicleImageUrl(src);
      if (!url) return null;
      return { url, alt: g.alt?.trim() || `${name} — image ${i + 1}` };
    })
    .filter((x): x is { url: string; alt: string } => x != null);
}

export async function fetchSitemapVehicles(): Promise<
  { slug: string; _updatedAt: string }[]
> {
  if (!client) return [];
  return client.fetch(sitemapVehiclesQuery);
}

export async function fetchSitemapCarParts(): Promise<
  { slug: string; _updatedAt: string }[]
> {
  if (!client) return [];
  return client.fetch(sitemapCarPartsQuery);
}
