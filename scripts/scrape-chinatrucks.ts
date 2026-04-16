import { createClient } from "@sanity/client";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const CATEGORY_URLS = [
  "https://www.chinatrucks.org/product/truck/special-vehicles/",
  "https://www.chinatrucks.org/product/truck/light-truck/",
  "https://www.chinatrucks.org/product/truck/heavy-truck/",
  "https://www.chinatrucks.org/product/truck/cargo-truck/",
  "https://www.chinatrucks.org/product/truck/dumper/",
  "https://www.chinatrucks.org/product/truck/tractors/",
] as const;

const KNOWN_BRANDS = [
  "Mercedes-Benz",
  "Sinotruk",
  "Dongfeng",
  "Shacman",
  "Foton",
  "Jiefang",
  "FAW",
  "Yutong",
  "JAC",
  "Beiben",
  "XCMG",
  "BYD",
  "SAIC",
  "Volvo",
  "MAN",
  "HINO",
  "C&C",
  "CAMC",
  "Dayun",
  "Hyundai",
  "Qingling",
  "SANY",
  "Chenglong",
  "Forland",
  "Reach",
  "Landking",
];

type TruckListing = {
  sourceUrl: string;
  categorySlug: string;
  title: string;
  imageUrls: string[];
  brandName: string | null;
  model: string | null;
  year: number | null;
  registrationYear: string | null;
  mileage: number | null;
  fuelType: string | null;
  engineDisplacement: string | null;
  transmission: string | null;
  drivetrain: string | null;
  bodyType: string | null;
  seats: number | null;
  doors: number | null;
  weightKg: number | null;
  batteryCapacityKwh: number | null;
  rangeKm: number | null;
  specs: Record<string, string>;
  features: string[];
  isNewEnergy: boolean;
};

type ProductLink = {
  url: string;
  categorySlug: string;
};

type CliOptions = {
  limit: number | null;
  dryRun: boolean;
  noOpenAI: boolean;
  fromOutput: boolean;
};

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const sanityToken =
  process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN || "";
const openAiKey = process.env.OPENAI_API_KEY || "";

const sanity =
  sanityToken.length > 0
    ? createClient({
        projectId,
        dataset,
        apiVersion: "2024-01-01",
        token: sanityToken,
        useCdn: false,
      })
    : null;

const openai = openAiKey.length > 0 ? new OpenAI({ apiKey: openAiKey }) : null;
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 8000;

function getCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1] ?? "", 10) : null;
  return {
    limit: Number.isFinite(limit) ? limit : null,
    dryRun: args.includes("--dry-run"),
    noOpenAI: args.includes("--no-openai"),
    fromOutput: args.includes("--from-output"),
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(input: string): string {
  return decodeHtmlEntities(
    input
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{2,}/g, "\n"),
  );
}

function parseNumeric(value: string | null): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function inferBrand(title: string): string | null {
  const normalized = title.toLowerCase();
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  const hit = sorted.find((brand) => normalized.startsWith(brand.toLowerCase()));
  if (hit) return hit;
  const firstWord = title.split(" ")[0]?.trim();
  return firstWord && firstWord.length > 1 ? firstWord : null;
}

function inferModel(title: string, brand: string | null): string | null {
  if (!brand) return null;
  const model = title.replace(new RegExp(`^${brand}\\s+`, "i"), "").trim();
  return model.length > 0 ? model : null;
}

function inferYear(title: string): number | null {
  const match = title.match(/\b(20\d{2})\b/);
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) ? year : null;
}

function inferIsNewEnergy(fuelType: string | null, title: string): boolean {
  const haystack = `${fuelType || ""} ${title}`.toLowerCase();
  return /electric|bev|phev|hybrid|hydrogen|fuel cell|battery/i.test(haystack);
}

function categorySlugFromUrl(url: string): string {
  const match = url.match(/\/product\/truck\/([^/]+)\//);
  return match?.[1] || "trucks";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error: unknown): boolean {
  const maybeError = error as { code?: unknown; message?: unknown } | null;
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  const message = typeof maybeError?.message === "string" ? maybeError.message : String(error);
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    /ECONNRESET|ETIMEDOUT/i.test(message)
  );
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRY_ATTEMPTS;
      if (!isRetryableNetworkError(error) || isLastAttempt) {
        throw error;
      }

      const delayMs = Math.min(
        INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1),
        MAX_RETRY_DELAY_MS,
      );
      const message =
        typeof (error as { message?: unknown } | null)?.message === "string"
          ? (error as { message: string }).message
          : String(error);

      console.warn(
        `${label} failed (${message}). Retry ${attempt}/${MAX_RETRY_ATTEMPTS - 1} in ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }

  throw new Error(`${label} failed after retries`);
}

async function fetchHtml(url: string): Promise<string> {
  const response = await withRetry(`Fetch ${url}`, () =>
    fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }),
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function extractProductUrls(categoryHtml: string): string[] {
  const productUrls = new Set<string>();
  const regex = /href=["']([^"']*\/product\/truck\/\d+\.html)["']/gi;
  let match: RegExpExecArray | null = regex.exec(categoryHtml);
  while (match) {
    const href = match[1];
    if (href.startsWith("http")) {
      productUrls.add(href);
    } else {
      productUrls.add(`https://www.chinatrucks.org${href}`);
    }
    match = regex.exec(categoryHtml);
  }
  return [...productUrls];
}

function extractTitleFromHtml(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const titleText = h1 ? normalizeSpace(stripTags(h1)) : "";
  if (titleText) {
    return titleText
      .replace(/\s*-\s*www\.chinatrucks\.org$/i, "")
      .replace(/\s*-\s*(Special Vehicles|Light Truck|Heavy truck|Cargo Truck|Dumper|Tractor)\s*$/i, "")
      .trim();
  }
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return normalizeSpace(stripTags(titleTag))
    .replace(/\s*-\s*www\.chinatrucks\.org$/i, "")
    .replace(/\s*-\s*(Special Vehicles|Light Truck|Heavy truck|Cargo Truck|Dumper|Tractor)\s*$/i, "")
    .trim();
}

function extractSpecsFromText(text: string): Record<string, string> {
  const lines = text
    .split("\n")
    .map((line) => normalizeSpace(line.replace(/^[*•\-]+\s*/, "")))
    .filter(Boolean);

  const startIdx = lines.findIndex((line) => /Technical Parameter/i.test(line));
  if (startIdx < 0) return {};

  const specs: Record<string, string> = {};
  const stopPatterns = [
    /Related News/i,
    /Products/i,
    /Recommended Parts/i,
    /China Trucks International Promotion/i,
    /About Us/i,
  ];

  let i = startIdx + 1;
  while (i < lines.length) {
    const key = lines[i];
    if (!key || stopPatterns.some((pattern) => pattern.test(key))) break;
    const maybeValue = lines[i + 1] || "";
    if (
      maybeValue &&
      !stopPatterns.some((pattern) => pattern.test(maybeValue)) &&
      !/^[A-Za-z][A-Za-z0-9\s()/.\-]{2,45}$/.test(maybeValue)
    ) {
      specs[key] = maybeValue;
      i += 2;
      continue;
    }

    if (maybeValue && !stopPatterns.some((pattern) => pattern.test(maybeValue))) {
      specs[key] = maybeValue;
      i += 2;
      continue;
    }
    i += 1;
  }

  return specs;
}

function resolveUrl(maybeUrl: string, baseUrl: string): string | null {
  const clean = maybeUrl.trim();
  if (!clean) return null;
  if (clean.startsWith("data:")) return null;
  if (clean.startsWith("javascript:")) return null;
  if (clean.startsWith("//")) return `https:${clean}`;
  try {
    return new URL(clean, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractImageUrlsFromHtml(html: string, pageUrl: string): string[] {
  const candidates = new Set<string>();

  // Prefer OG image if present.
  const ogImageMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  if (ogImageMatch?.[1]) {
    const resolved = resolveUrl(ogImageMatch[1], pageUrl);
    if (resolved) candidates.add(resolved);
  }

  // Capture common image sources in content.
  const imgRegex =
    /<(?:img|source)[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null = imgRegex.exec(html);
  while (match) {
    const resolved = resolveUrl(match[1], pageUrl);
    if (resolved && /\.(jpe?g|png|webp)(\?.*)?$/i.test(resolved)) {
      candidates.add(resolved);
    }
    match = imgRegex.exec(html);
  }

  const score = (url: string): number => {
    let s = 0;
    if (/\/wp-content\/uploads\//i.test(url)) s += 5;
    if (/product|truck|vehicle|chinatrucks/i.test(url)) s += 2;
    if (/logo|icon|avatar|banner|ads|sprite/i.test(url)) s -= 6;
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a)).slice(0, 6);
}

async function generateFeaturesWithOpenAI(
  listing: Pick<TruckListing, "title" | "specs" | "fuelType" | "drivetrain" | "bodyType">,
): Promise<string[]> {
  if (!openai) return [];
  const importantSpecs = Object.entries(listing.specs)
    .slice(0, 8)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  const prompt = [
    `Truck title: ${listing.title}`,
    `Fuel: ${listing.fuelType || "unknown"}`,
    `Drivetrain: ${listing.drivetrain || "unknown"}`,
    `Body type: ${listing.bodyType || "unknown"}`,
    `Specs: ${importantSpecs || "none"}`,
    "Generate 3 concise product feature bullets in plain English.",
    "Each bullet must be <= 12 words.",
    "Return ONLY a JSON array of strings.",
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You produce short and factual product feature bullets.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    });
    const content = completion.choices[0]?.message?.content || "[]";
    const parsed = JSON.parse(content) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim())
        .slice(0, 3);
    }
    return [];
  } catch {
    return [];
  }
}

async function parseDetailPage(
  url: string,
  categorySlug: string,
  noOpenAI: boolean,
): Promise<TruckListing> {
  const html = await fetchHtml(url);
  const text = stripTags(html);
  const title = extractTitleFromHtml(html);
  const imageUrls = extractImageUrlsFromHtml(html, url);
  const specs = extractSpecsFromText(text);
  const brandName = inferBrand(title);
  const model = inferModel(title, brandName);

  const fuelType =
    specs["Fuel Type"] ||
    specs["fuel type"] ||
    specs["Fuel"] ||
    specs["Engine Type"] ||
    null;
  const drivetrain = specs["Driving Type"] || specs["Drivetrain"] || null;
  const featuresFromSpecs = [
    specs["Transmission Model"] ? `Transmission: ${specs["Transmission Model"]}` : null,
    specs["Emission Level"] ? `Emission: ${specs["Emission Level"]}` : null,
    specs["Max Speed(km/h）"] ? `Max speed: ${specs["Max Speed(km/h）"]}` : null,
    specs["Horsepower(Ps)"] ? `Horsepower: ${specs["Horsepower(Ps)"]}` : null,
  ].filter((x): x is string => Boolean(x));

  const aiFeatures =
    !noOpenAI && featuresFromSpecs.length === 0
      ? await generateFeaturesWithOpenAI({
          title,
          specs,
          fuelType,
          drivetrain,
          bodyType: specs["Body Type"] || null,
        })
      : [];

  return {
    sourceUrl: url,
    categorySlug,
    title,
    imageUrls,
    brandName,
    model,
    year: inferYear(title),
    registrationYear: null,
    mileage: parseNumeric(specs["Mileage"] || null),
    fuelType,
    engineDisplacement:
      specs["Engine Displacement(L)"] ||
      specs["Engine Model"] ||
      specs["Engine"] ||
      null,
    transmission: specs["Transmission Model"] || specs["Gear Shift"] || null,
    drivetrain,
    bodyType: specs["Body Type"] || specs["Driving Type"] || null,
    seats: parseNumeric(specs["Passenger Capacity"] || null),
    doors: parseNumeric(specs["Doors"] || null),
    weightKg: parseNumeric(specs["Curb Weight(kg)"] || null),
    batteryCapacityKwh: parseNumeric(specs["Battery Capacity(kWh)"] || null),
    rangeKm: parseNumeric(specs["Range(km)"] || null),
    specs,
    features: [...featuresFromSpecs, ...aiFeatures].slice(0, 8),
    isNewEnergy: inferIsNewEnergy(fuelType, title),
  };
}

const imageAssetByUrl = new Map<string, string>();

function filenameFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const name = pathname.split("/").pop() || "truck-image.jpg";
  return name.includes(".") ? name : `${name}.jpg`;
}

async function uploadImageToSanity(imageUrl: string): Promise<string | null> {
  if (!sanity) return null;
  const cached = imageAssetByUrl.get(imageUrl);
  if (cached) return cached;

  const response = await withRetry(`Download image ${imageUrl}`, () =>
    fetch(imageUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }),
  );
  if (!response.ok) {
    throw new Error(`Failed image download ${imageUrl}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const fileBuffer = Buffer.from(await response.arrayBuffer());
  const filename = filenameFromUrl(imageUrl);

  const asset = await withRetry(`Upload image ${imageUrl}`, () =>
    sanity.assets.upload("image", fileBuffer, { filename, contentType }),
  );
  imageAssetByUrl.set(imageUrl, asset._id);
  return asset._id;
}

async function buildSanityImages(
  imageUrls: string[],
): Promise<Array<{ _type: "image"; asset: { _type: "reference"; _ref: string } }>> {
  const images: Array<{ _type: "image"; asset: { _type: "reference"; _ref: string } }> = [];
  for (const imageUrl of imageUrls) {
    try {
      const assetId = await uploadImageToSanity(imageUrl);
      if (!assetId) continue;
      images.push({
        _type: "image",
        asset: { _type: "reference", _ref: assetId },
      });
    } catch (error) {
      console.warn(`Failed image upload ${imageUrl}: ${String(error)}`);
    }
  }
  return images;
}

async function ensureTruckCategoryId(): Promise<string | null> {
  if (!sanity) return null;

  const existing = await sanity.fetch<{ _id: string } | null>(
    `*[_type == "vehicleCategory" && (slug.current == "truck" || title match "Truck*")][0]{_id}`,
  );
  if (existing?._id) {
    const doc = await sanity.fetch<{ appliesToSegments?: string[] } | null>(
      `*[_id == $id][0]{appliesToSegments}`,
      { id: existing._id },
    );
    const segs = doc?.appliesToSegments ?? [];
    if (!segs.includes("truck")) {
      await sanity
        .patch(existing._id)
        .set({ appliesToSegments: [...segs, "truck"] })
        .commit();
    }
    return existing._id;
  }

  const id = "vehicleCategory-truck";
  await sanity.createOrReplace({
    _id: id,
    _type: "vehicleCategory",
    title: "Truck",
    slug: { _type: "slug", current: "truck" },
    description: "Truck vehicles scraped from ChinaTrucks.",
    order: 5,
    appliesToSegments: ["truck"],
  });
  return id;
}

async function ensureTruckTypeId(categoryId: string, categorySlug: string): Promise<string> {
  if (!sanity) return `vehicleType-${categorySlug}`;
  const normalizedSlug = `truck-${slugify(categorySlug)}`;
  const existing = await sanity.fetch<{ _id: string } | null>(
    `*[_type == "vehicleType" && slug.current == $slug][0]{_id}`,
    { slug: normalizedSlug },
  );
  if (existing?._id) return existing._id;

  const id = `vehicleType-${normalizedSlug}`;
  await sanity.createOrReplace({
    _id: id,
    _type: "vehicleType",
    title: categorySlug
      .split("-")
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" "),
    slug: { _type: "slug", current: normalizedSlug },
    category: { _type: "reference", _ref: categoryId },
    description: `Truck type from ChinaTrucks ${categorySlug} category.`,
    order: 0,
  });
  return id;
}

async function ensureBrandId(brandName: string): Promise<string | null> {
  if (!sanity) return null;
  const normalized = slugify(brandName);
  const existing = await sanity.fetch<{ _id: string } | null>(
    `*[_type == "brand" && slug.current == $slug][0]{_id}`,
    { slug: normalized },
  );
  if (existing?._id) return existing._id;

  const id = `brand-${normalized}`;
  await sanity.createOrReplace({
    _id: id,
    _type: "brand",
    title: brandName,
    slug: { _type: "slug", current: normalized },
    isHot: false,
    order: 999,
  });
  return id;
}

async function upsertTruckVehicle(
  listing: TruckListing,
  truckCategoryId: string | null,
): Promise<void> {
  if (!sanity) return;
  const productId = listing.sourceUrl.match(/\/(\d+)\.html$/)?.[1] || slugify(listing.title);
  const docId = `truck-${productId}`;
  const slug = `${slugify(listing.title)}-${productId}`.slice(0, 96);

  const brandRef =
    listing.brandName && listing.brandName.length > 0
      ? await ensureBrandId(listing.brandName)
      : null;
  const typeRef =
    truckCategoryId && listing.categorySlug
      ? await ensureTruckTypeId(truckCategoryId, listing.categorySlug)
      : null;

  let imageUrls = listing.imageUrls || [];
  // Backward compatibility for older saved outputs that do not contain imageUrls.
  if (imageUrls.length === 0) {
    try {
      const html = await fetchHtml(listing.sourceUrl);
      imageUrls = extractImageUrlsFromHtml(html, listing.sourceUrl);
    } catch (error) {
      console.warn(`Could not fetch images for ${listing.sourceUrl}: ${String(error)}`);
    }
  }
  const sanityImages = await buildSanityImages(imageUrls);

  const doc = {
    _id: docId,
    _type: "vehicle",
    title: listing.title,
    slug: { _type: "slug", current: slug || `truck-${productId}` },
    brand: brandRef ? { _type: "reference", _ref: brandRef } : undefined,
    model: listing.model || undefined,
    year: listing.year ?? undefined,
    registrationYear: listing.registrationYear ?? undefined,
    mileage: listing.mileage ?? undefined,
    fuelType: listing.fuelType ?? undefined,
    engineDisplacement: listing.engineDisplacement ?? undefined,
    transmission: listing.transmission ?? undefined,
    bodyType: listing.bodyType ?? undefined,
    seats: listing.seats ?? undefined,
    doors: listing.doors ?? undefined,
    weightKg: listing.weightKg ?? undefined,
    batteryCapacityKwh: listing.batteryCapacityKwh ?? undefined,
    rangeKm: listing.rangeKm ?? undefined,
    drivetrain: listing.drivetrain ?? undefined,
    features: listing.features.length > 0 ? listing.features : undefined,
    images: sanityImages.length > 0 ? sanityImages : undefined,
    category: truckCategoryId
      ? { _type: "reference", _ref: truckCategoryId }
      : undefined,
    type: typeRef ? { _type: "reference", _ref: typeRef } : undefined,
    sku: `CT-${productId}`,
    vehicleSegment: "truck" as const,
    isOnSale: true,
    isNewEnergy: listing.isNewEnergy,
    scrapedAt: new Date().toISOString().slice(0, 10),
  };

  await sanity.createOrReplace(doc);
}

async function scrapeAllTruckProductUrls(): Promise<ProductLink[]> {
  const allUrls = new Map<string, ProductLink>();
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchHtml(categoryUrl);
    const links = extractProductUrls(html);
    const categorySlug = categorySlugFromUrl(categoryUrl);
    for (const link of links) {
      if (!allUrls.has(link)) {
        allUrls.set(link, { url: link, categorySlug });
      }
    }
  }
  return [...allUrls.values()];
}

async function main() {
  const options = getCliOptions();
  if (!options.dryRun && !sanity) {
    console.error(
      "Missing SANITY API token. Set SANITY_API_TOKEN (or NEXT_PUBLIC_SANITY_API_TOKEN) or use --dry-run.",
    );
    process.exit(1);
  }

  const outputPath = path.resolve(process.cwd(), "scripts", "output-chinatrucks.json");
  let results: TruckListing[] = [];

  if (options.fromOutput) {
    if (!fs.existsSync(outputPath)) {
      console.error(`Cannot resume: output file not found at ${outputPath}`);
      process.exit(1);
    }
    try {
      const raw = fs.readFileSync(outputPath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        console.error(`Invalid JSON in ${outputPath}: expected an array.`);
        process.exit(1);
      }
      results = parsed as TruckListing[];
      console.log(`Loaded ${results.length} records from ${outputPath}.`);
    } catch (error) {
      console.error(`Failed reading ${outputPath}: ${String(error)}`);
      process.exit(1);
    }
  } else {
    const productLinks = await scrapeAllTruckProductUrls();
    const finalLinks =
      options.limit && options.limit > 0
        ? productLinks.slice(0, options.limit)
        : productLinks;

    console.log(`Found ${productLinks.length} truck product URLs.`);
    console.log(`Processing ${finalLinks.length} URLs...`);

    for (let i = 0; i < finalLinks.length; i += 1) {
      const link = finalLinks[i];
      try {
        console.log(`[${i + 1}/${finalLinks.length}] ${link.url}`);
        const listing = await parseDetailPage(
          link.url,
          link.categorySlug,
          options.noOpenAI || !openai,
        );
        results.push(listing);
      } catch (error) {
        console.warn(`Skip ${link.url}: ${String(error)}`);
      }
    }
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), "utf8");
    console.log(`Saved ${results.length} records to ${outputPath}`);
  }

  if (options.limit && options.limit > 0) {
    results = results.slice(0, options.limit);
    console.log(`Using first ${results.length} records after --limit.`);
  }

  if (options.dryRun || !sanity) return;

  const truckCategoryId = await ensureTruckCategoryId();
  let successCount = 0;
  let failCount = 0;
  for (let i = 0; i < results.length; i += 1) {
    const listing = results[i];
    try {
      await withRetry(`Upsert ${listing.sourceUrl}`, () =>
        upsertTruckVehicle(listing, truckCategoryId),
      );
      successCount += 1;
    } catch (error) {
      failCount += 1;
      console.warn(`Failed to upsert ${listing.sourceUrl}: ${String(error)}`);
    }
    if ((i + 1) % 25 === 0 || i + 1 === results.length) {
      console.log(
        `Upsert progress: ${i + 1}/${results.length} (ok=${successCount}, failed=${failCount})`,
      );
    }
  }

  console.log(
    `Upserted ${results.length} truck records into Sanity (ok=${successCount}, failed=${failCount}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
