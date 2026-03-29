import { resolveCarPartPriceRange } from "@/lib/sanity/car-part-price";
import type {
  CarPartDetailDoc,
  VehicleDetailDoc,
} from "@/lib/sanity/product-detail";
import { absoluteUrl } from "@/lib/seo/site-url";

function vehicleDescription(doc: VehicleDetailDoc): string {
  const parts: string[] = [];
  if (doc.tagline?.trim()) parts.push(doc.tagline.trim());
  const brand = doc.brand?.title?.trim();
  const model = doc.model?.trim();
  if (brand || model) {
    parts.push([brand, model].filter(Boolean).join(" ").trim() || doc.title);
  }
  const specs = [
    doc.registrationYear && `Registration: ${doc.registrationYear}`,
    doc.mileage != null && `Mileage: ${doc.mileage.toLocaleString("en-US")} km`,
    doc.fuelType && `Fuel: ${doc.fuelType}`,
    doc.transmission && `Transmission: ${doc.transmission}`,
  ].filter(Boolean) as string[];
  if (specs.length) parts.push(specs.join(". "));
  parts.push("Photos, specifications, and inquiry on Zhixin.");
  return parts.join(" — ").slice(0, 320);
}

export function buildVehicleMetaDescription(doc: VehicleDetailDoc): string {
  return vehicleDescription(doc).slice(0, 160);
}

function carPartDescription(doc: CarPartDetailDoc): string {
  const parts: string[] = [];
  if (doc.description?.trim()) {
    parts.push(doc.description.trim().replace(/\s+/g, " ").slice(0, 200));
  } else {
    parts.push(
      `${doc.name}${doc.partNumber ? ` (Part #${doc.partNumber})` : ""} — ${doc.category.replace(/-/g, " ")} spare part.`,
    );
  }
  if (doc.brand?.trim()) parts.push(`Brand: ${doc.brand.trim()}.`);
  parts.push("Pricing, fitment notes, and WhatsApp inquiry on Zhixin.");
  return parts.join(" ").slice(0, 320);
}

export function buildCarPartMetaDescription(doc: CarPartDetailDoc): string {
  return carPartDescription(doc).slice(0, 160);
}

export function vehicleProductJsonLd(
  doc: VehicleDetailDoc,
  canonicalPath: string,
  imageUrls: string[],
): Record<string, unknown> {
  const url = absoluteUrl(canonicalPath);
  const brandName = doc.brand?.title?.trim();
  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: doc.title,
    sku: doc.sku || doc._id,
    description: vehicleDescription(doc),
    url,
    category: doc.category?.title || doc.vehicleSegment || "Vehicle",
  };
  if (brandName) {
    product.brand = { "@type": "Brand", name: brandName };
  }
  if (imageUrls.length) {
    product.image = imageUrls.slice(0, 8);
  }
  if (doc.price != null && doc.price > 0) {
    product.offers = {
      "@type": "Offer",
      url,
      priceCurrency: "USD",
      price: String(doc.price),
      availability: "https://schema.org/OnlineOnly",
      itemCondition: "https://schema.org/UsedCondition",
    };
  }
  return product;
}

export function carPartProductJsonLd(
  doc: CarPartDetailDoc,
  canonicalPath: string,
  imageUrls: string[],
): Record<string, unknown> {
  const url = absoluteUrl(canonicalPath);
  const product: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: doc.name,
    sku: doc.partNumber || doc._id,
    description: carPartDescription(doc),
    url,
    category: doc.category,
  };
  if (doc.brand?.trim()) {
    product.brand = { "@type": "Brand", name: doc.brand.trim() };
  }
  if (imageUrls.length) {
    product.image = imageUrls.slice(0, 8);
  }
  const pr = resolveCarPartPriceRange(doc);
  if (pr) {
    product.offers = {
      "@type": "AggregateOffer",
      url,
      priceCurrency: pr.currency || "USD",
      lowPrice: String(pr.min),
      highPrice: String(pr.max),
      availability: doc.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    };
  }
  return product;
}
