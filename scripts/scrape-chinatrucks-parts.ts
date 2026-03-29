/**
 * Scrape ChinaTrucks parts listing pages (engine, transmission, axle, tire, retarder, other-parts)
 * and upsert Sanity `carPart` documents.
 *
 * Sources (category index pages):
 * - https://www.chinatrucks.org/product/parts/engine/
 * - https://www.chinatrucks.org/product/parts/transmission/
 * - https://www.chinatrucks.org/product/parts/axle/
 * - https://www.chinatrucks.org/product/parts/tire/
 * - https://www.chinatrucks.org/product/parts/retarder/
 * - https://www.chinatrucks.org/product/parts/other-parts/
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

type PartCategory =
  | "engine"
  | "transmission"
  | "axle"
  | "tire"
  | "retarder"
  | "other";

const PART_CATEGORY_PAGES: { listUrl: string; category: PartCategory }[] = [
  {
    listUrl: "https://www.chinatrucks.org/product/parts/engine/",
    category: "engine",
  },
  {
    listUrl: "https://www.chinatrucks.org/product/parts/transmission/",
    category: "transmission",
  },
  {
    listUrl: "https://www.chinatrucks.org/product/parts/axle/",
    category: "axle",
  },
  {
    listUrl: "https://www.chinatrucks.org/product/parts/tire/",
    category: "tire",
  },
  {
    listUrl: "https://www.chinatrucks.org/product/parts/retarder/",
    category: "retarder",
  },
  {
    listUrl: "https://www.chinatrucks.org/product/parts/other-parts/",
    category: "other",
  },
];

/** Prefer longer matches first (substrings of other names). */
const KNOWN_PART_BRANDS = [
  "Dongfeng Cummins",
  "Dongfeng Longqing",
  "Dongfeng Dana",
  "Foton Cummins",
  "Anhui Cummins",
  "Xi'an Cummins",
  "Mercedes-Benz",
  "Gotion High-tech",
  "GOTION HIGH-TECH",
  "FAWDE POWER-WIN",
  "FAWDE Aowei",
  "Xichai (FAWDE)",
  "FAW Xichai",
  "Qijiang Gear",
  "FuelSense",
  "Super ETOT",
  "Fullrun Tyre",
  "Fullrun Tire",
  "Aeolustyre",
  "LINGLONG",
  "Linglong",
  "AEOLUS",
  "Aeolus",
  "Techking",
  "Cummins",
  "Allison",
  "Weichai",
  "Yunnei",
  "Yuchai",
  "Sinotruk",
  "Dongfeng",
  "Shacman",
  "Foton",
  "Jiefang",
  "FAW",
  "SDEC",
  "Voith",
  "Telma",
  "Fuwa",
  "Hande",
  "HanDe",
  "HANDE",
  "ZF",
  "FPT Industrial",
  "SANY Deutz",
  "CATL",
  "Bosch",
  "Hyva",
  "Bohai",
  "Kelas",
  "Lopal",
  "Alcoa",
];

type PartListing = {
  sourceUrl: string;
  category: PartCategory;
  name: string;
  description: string | null;
  imageUrls: string[];
  brandName: string | null;
};

type ProductLink = { url: string; category: PartCategory };

type CliOptions = {
  limit: number | null;
  dryRun: boolean;
  fromOutput: boolean;
};

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const sanityToken =
  process.env.SANITY_API_TOKEN ||
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN ||
  "";

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

const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 8000;

function getCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg
    ? Number.parseInt(limitArg.split("=")[1] ?? "", 10)
    : null;
  return {
    limit: Number.isFinite(limit) ? limit : null,
    dryRun: args.includes("--dry-run"),
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
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{2,}/g, "\n"),
  );
}

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(error: unknown): boolean {
  const maybeError = error as {
    code?: unknown;
    message?: unknown;
    cause?: unknown;
  } | null;
  const code = typeof maybeError?.code === "string" ? maybeError.code : "";
  const message =
    typeof maybeError?.message === "string"
      ? maybeError.message
      : String(error);
  const cause = maybeError?.cause as
    | { code?: string; message?: string }
    | undefined;
  const causeCode = typeof cause?.code === "string" ? cause.code : "";
  const causeMsg = typeof cause?.message === "string" ? cause.message : "";
  const haystack = `${message} ${causeCode} ${causeMsg}`;
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    causeCode === "ENOTFOUND" ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|getaddrinfo|ECONNREFUSED/i.test(
      haystack,
    )
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
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }
  return response.text();
}

function extractPartProductUrls(html: string): string[] {
  const productUrls = new Set<string>();
  const regex = /href=["']([^"']*\/product\/parts\/\d+\.html)["']/gi;
  let match: RegExpExecArray | null = regex.exec(html);
  while (match) {
    const href = match[1];
    if (href.startsWith("http")) {
      productUrls.add(href);
    } else {
      productUrls.add(`https://www.chinatrucks.org${href}`);
    }
    match = regex.exec(html);
  }
  return [...productUrls];
}

function extractTitleFromHtml(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const titleText = h1 ? normalizeSpace(stripTags(h1)) : "";
  if (titleText) {
    return titleText
      .replace(/\s*-\s*www\.chinatrucks\.org$/i, "")
      .replace(/\s*-\s*Engine,?\s*China Truck Parts.*$/i, "")
      .replace(/\s*-\s*Transmission,?\s*China Truck Parts.*$/i, "")
      .trim();
  }
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return normalizeSpace(stripTags(titleTag))
    .replace(/\s*-\s*Engine,?\s*China Truck Parts.*$/i, "")
    .replace(/\s*-\s*Transmission,?\s*China Truck Parts.*$/i, "")
    .replace(/\s*-\s*www\.chinatrucks\.org$/i, "")
    .trim();
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

/** HTML sometimes points at chinatrucks.com; live assets are on chinatrucks.org. */
function normalizeChinatrucksImageUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/chinatrucks\.com$/i.test(u.hostname)) {
      u.hostname = u.hostname.replace(/chinatrucks\.com$/i, "chinatrucks.org");
      return u.toString();
    }
  } catch {
    /* ignore */
  }
  return url;
}

/** Footer / UI assets (e.g. ghs.png) — not product photos. */
function isRejectedPartImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (/\/statics\//i.test(lower)) return true;
  const file = lower.split("/").pop() || "";
  const base = file.replace(/\.(jpe?g|png|webp)(\?.*)?$/i, "");
  if (
    /^(logo|ghs|icon|sprite|spacer|pixel|1x1|blank|clear)$/i.test(base) ||
    /(logo|ghs|banner|ad-|ads-|favicon)/i.test(file)
  ) {
    return true;
  }
  return false;
}

function extractPartImageUrls(html: string, pageUrl: string): string[] {
  const candidates = new Set<string>();

  const pushIfProductImage = (raw: string, requireUploadfile: boolean) => {
    const resolved = resolveUrl(raw, pageUrl);
    if (!resolved || !/\.(jpe?g|png|webp)(\?.*)?$/i.test(resolved)) return;
    const url = normalizeChinatrucksImageUrl(resolved);
    if (isRejectedPartImageUrl(url)) return;
    if (requireUploadfile && !/\/uploadfile\//i.test(url)) return;
    candidates.add(url);
  };

  const smallGallery = html.matchAll(
    /<ul[^>]*class=["'][^"']*exter-small[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi,
  );
  for (const block of smallGallery) {
    const inner = block[1] || "";
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null = imgRegex.exec(inner);
    while (m) {
      pushIfProductImage(m[1], false);
      m = imgRegex.exec(inner);
    }
  }

  const ogImageMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  );
  if (ogImageMatch?.[1]) {
    pushIfProductImage(ogImageMatch[1], true);
  }

  const imgRegex =
    /<(?:img|source)[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null = imgRegex.exec(html);
  while (match) {
    pushIfProductImage(match[1], true);
    match = imgRegex.exec(html);
  }

  const score = (url: string): number => {
    let s = 0;
    if (/\/uploadfile\//i.test(url)) s += 8;
    if (/exter-small|product|parts/i.test(url)) s += 1;
    if (/logo|icon|avatar|banner|ads|sprite|statics/i.test(url)) s -= 10;
    return s;
  };

  return [...candidates].sort((a, b) => score(b) - score(a)).slice(0, 8);
}

function extractPartDescription(html: string): string | null {
  const metaDesc = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
  )?.[1];
  if (metaDesc && metaDesc.trim().length > 3) {
    return normalizeSpace(decodeHtmlEntities(metaDesc));
  }
  const desBlock = html.match(
    /<div[^>]*class=["'][^"']*truck-des[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  )?.[1];
  if (desBlock) {
    const text = normalizeSpace(stripTags(desBlock));
    return text.length > 0 ? text : null;
  }
  return null;
}

function inferBrand(title: string): string | null {
  const normalized = title.toLowerCase();
  const sorted = [...KNOWN_PART_BRANDS].sort((a, b) => b.length - a.length);
  const hit = sorted.find((brand) =>
    normalized.startsWith(brand.toLowerCase()),
  );
  if (hit) return hit;
  const firstWord = title.split(/[\s(/]/)[0]?.trim();
  return firstWord && firstWord.length > 1 ? firstWord : null;
}

async function parsePartDetailPage(
  url: string,
  category: PartCategory,
): Promise<PartListing> {
  const html = await fetchHtml(url);
  const name = extractTitleFromHtml(html);
  const imageUrls = extractPartImageUrls(html, url);
  const description = extractPartDescription(html);
  const brandName = inferBrand(name);

  return {
    sourceUrl: url,
    category,
    name,
    description,
    imageUrls,
    brandName,
  };
}

const imageAssetByUrl = new Map<string, string>();

function filenameFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const name = pathname.split("/").pop() || "part-image.jpg";
  return name.includes(".") ? name : `${name}.jpg`;
}

async function uploadImageToSanity(imageUrl: string): Promise<string | null> {
  if (!sanity) return null;

  const normalizedUrl = normalizeChinatrucksImageUrl(imageUrl);
  if (isRejectedPartImageUrl(normalizedUrl)) {
    return null;
  }

  const cacheKey = normalizedUrl;
  const cached = imageAssetByUrl.get(cacheKey);
  if (cached) return cached;

  const imageHeaders = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    referer: "https://www.chinatrucks.org/",
  };

  async function fetchImageOk(url: string): Promise<Response> {
    const res = await fetch(url, { headers: imageHeaders });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return res;
  }

  let response: Response;
  try {
    response = await withRetry(`Download image ${cacheKey}`, () =>
      fetchImageOk(cacheKey),
    );
  } catch (firstError) {
    const tryOriginal =
      imageUrl !== cacheKey && !isRejectedPartImageUrl(imageUrl);
    if (!tryOriginal) {
      throw firstError;
    }
    response = await withRetry(
      `Download image (fallback URL) ${imageUrl}`,
      () => fetchImageOk(imageUrl),
    );
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  if (!/^image\//i.test(contentType)) {
    throw new Error(`Not an image (${contentType}): ${cacheKey}`);
  }

  const fileBuffer = Buffer.from(await response.arrayBuffer());
  const filename = filenameFromUrl(cacheKey);

  const asset = await withRetry(`Upload image ${cacheKey}`, () =>
    sanity.assets.upload("image", fileBuffer, { filename, contentType }),
  );
  imageAssetByUrl.set(cacheKey, asset._id);
  return asset._id;
}

async function buildGallery(imageUrls: string[]): Promise<
  Array<{
    _type: "object";
    _key: string;
    image: { _type: "image"; asset: { _type: "reference"; _ref: string } };
    alt?: string;
  }>
> {
  const gallery: Array<{
    _type: "object";
    _key: string;
    image: { _type: "image"; asset: { _type: "reference"; _ref: string } };
    alt?: string;
  }> = [];
  for (let i = 0; i < imageUrls.length; i += 1) {
    const imageUrl = imageUrls[i];
    try {
      const assetId = await uploadImageToSanity(imageUrl);
      if (!assetId) continue;
      gallery.push({
        _type: "object",
        _key: `img${i}`,
        image: { _type: "image", asset: { _type: "reference", _ref: assetId } },
      });
    } catch (error) {
      console.warn(`Failed image upload ${imageUrl}: ${String(error)}`);
    }
  }
  return gallery;
}

async function upsertCarPart(listing: PartListing): Promise<void> {
  if (!sanity) return;
  const productId =
    listing.sourceUrl.match(/\/(\d+)\.html$/)?.[1] || slugify(listing.name);
  const docId = `carPart-ct-${productId}`;
  const slugBase = `${slugify(listing.name)}-${productId}`.slice(0, 90);

  let imageUrls = listing.imageUrls;
  if (imageUrls.length === 0) {
    try {
      const html = await fetchHtml(listing.sourceUrl);
      imageUrls = extractPartImageUrls(html, listing.sourceUrl);
    } catch (error) {
      console.warn(
        `Could not refetch images for ${listing.sourceUrl}: ${String(error)}`,
      );
    }
  }

  const gallery = await buildGallery(imageUrls);

  const doc = {
    _id: docId,
    _type: "carPart" as const,
    name: listing.name,
    partNumber: `CT-PART-${productId}`,
    category: listing.category,
    brand: listing.brandName ?? undefined,
    description: listing.description ?? undefined,
    gallery: gallery.length > 0 ? gallery : undefined,
    slug: {
      _type: "slug" as const,
      current: slugBase || `ct-part-${productId}`,
    },
    isOnSale: true,
    inStock: true,
    publishedAt: new Date().toISOString(),
  };

  await sanity.createOrReplace(doc);
}

async function scrapeAllPartProductLinks(): Promise<ProductLink[]> {
  const allUrls = new Map<string, ProductLink>();
  for (const { listUrl, category } of PART_CATEGORY_PAGES) {
    const html = await fetchHtml(listUrl);
    const links = extractPartProductUrls(html);
    for (const link of links) {
      if (!allUrls.has(link)) {
        allUrls.set(link, { url: link, category });
      }
    }
    console.log(`Category ${category}: ${links.length} links from ${listUrl}`);
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

  const outputPath = path.resolve(
    process.cwd(),
    "scripts",
    "output-chinatrucks-parts.json",
  );
  let results: PartListing[] = [];

  if (options.fromOutput) {
    if (!fs.existsSync(outputPath)) {
      console.error(`Cannot resume: output file not found at ${outputPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(outputPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      console.error(`Invalid JSON in ${outputPath}: expected an array.`);
      process.exit(1);
    }
    results = parsed as PartListing[];
    console.log(`Loaded ${results.length} records from ${outputPath}.`);
  } else {
    const productLinks = await scrapeAllPartProductLinks();
    const finalLinks =
      options.limit && options.limit > 0
        ? productLinks.slice(0, options.limit)
        : productLinks;

    console.log(`Found ${productLinks.length} unique part product URLs.`);
    console.log(`Processing ${finalLinks.length} URLs...`);

    for (let i = 0; i < finalLinks.length; i += 1) {
      const link = finalLinks[i];
      try {
        console.log(`[${i + 1}/${finalLinks.length}] ${link.url}`);
        const listing = await parsePartDetailPage(link.url, link.category);
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

  if (options.dryRun || !sanity) {
    console.log("Dry run: skip Sanity upsert.");
    return;
  }

  let successCount = 0;
  let failCount = 0;
  for (let i = 0; i < results.length; i += 1) {
    const listing = results[i];
    try {
      await withRetry(`Upsert ${listing.sourceUrl}`, () =>
        upsertCarPart(listing),
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
    `Upserted ${results.length} part records into Sanity (ok=${successCount}, failed=${failCount}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
