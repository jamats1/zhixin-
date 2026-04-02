/**
 * Scrape https://www.bdspares.co.za/ (WooCommerce): brands → model lines → paginated product archives → product detail.
 * Converts ZAR to USD (Frankfurter API or BDSPARES_ZAR_USD_RATE), upserts `sparePartLine` + `carPart` in Sanity.
 *
 * Requires Puppeteer (403 without a real browser for many hosts).
 *
 * Run:
 *   npx tsx scripts/scrape-bdspares.ts --brand=mercedes-benz --limit=20
 *   npx tsx scripts/scrape-bdspares.ts --dry-run --brand=audi --line=q5 --limit=5
 *   npx tsx scripts/scrape-bdspares.ts --from-output  (reuse scripts/output-bdspares-parts.json)
 *   npx tsx scripts/scrape-bdspares.ts --exclude-brands=mercedes-benz  (all brands except these, comma-separated)
 *
 * Env: SANITY_API_TOKEN, NEXT_PUBLIC_SANITY_* ; optional BDSPARES_ZAR_USD_RATE
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import puppeteer, { type Browser, type Page } from "puppeteer";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const BASE = "https://www.bdspares.co.za";

const BRAND_SLUG_DENYLIST = new Set([
  "accessories",
  "cabin-filter",
  "fuel-filters",
  "oil-filters",
  "wheels",
  "brands",
  "shop",
  "product-category",
  "used-parts",
  "cart",
  "checkout",
  "my-account",
]);

type RetailCategory =
  | "lighting"
  | "body-panel"
  | "glass"
  | "filter"
  | "wheel"
  | "accessory"
  | "other-retail";

type SanityBrand = { _id: string; title: string; slug: string | null };
type SanityCarPartCategory = {
  _id: string;
  title: string;
  sourceKey?: string;
  slug: string | null;
};

type BdProductDetail = {
  sourceUrl: string;
  name: string;
  slug: string;
  sku: string | null;
  priceZar: number | null;
  inStock: boolean;
  description: string | null;
  dimensions: string | null;
  oemPartNumber: string | null;
  alternatePartNumbers: string[];
  woocommerceCategory: string | null;
  woocommerceBrandLabel: string | null;
  imageUrls: string[];
};

type LineJob = {
  brandSlug: string;
  lineSlug: string;
  path: string;
  listingUrl: string;
  lineTitle: string;
};

type CliOptions = {
  dryRun: boolean;
  fromOutput: boolean;
  brandFilter: string | null;
  lineFilter: string | null;
  excludeBrandSlugs: Set<string>;
  limit: number | null;
  delayMs: number;
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

function parseExcludeBrandSlugs(args: string[]): Set<string> {
  const out = new Set<string>();
  for (const a of args) {
    if (!a.startsWith("--exclude-brands=")) continue;
    const raw = (a.split("=")[1] ?? "").trim();
    for (const part of raw.split(",")) {
      const s = part.trim().toLowerCase();
      if (s) out.add(s);
    }
  }
  return out;
}

function getCliOptions(): CliOptions {
  const args = process.argv.slice(2);
  const brandArg = args.find((a) => a.startsWith("--brand="));
  const lineArg = args.find((a) => a.startsWith("--line="));
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const delayArg = args.find((a) => a.startsWith("--delay="));
  const limit = limitArg
    ? Number.parseInt(limitArg.split("=")[1] ?? "", 10)
    : null;
  const delayMs = delayArg
    ? Number.parseInt(delayArg.split("=")[1] ?? "", 10)
    : 900;
  return {
    dryRun: args.includes("--dry-run"),
    fromOutput: args.includes("--from-output"),
    brandFilter: brandArg
      ? (brandArg.split("=")[1] ?? "").trim().toLowerCase() || null
      : null,
    lineFilter: lineArg
      ? (lineArg.split("=")[1] ?? "").trim().toLowerCase() || null
      : null,
    excludeBrandSlugs: parseExcludeBrandSlugs(args),
    limit: Number.isFinite(limit) && limit !== null && limit > 0 ? limit : null,
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 900,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      .replace(/<[^>]+>/g, " "),
  );
}

function normalizeSpace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function slugifySegment(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function resolveUrl(href: string, base: string): string | null {
  const clean = href.trim();
  if (!clean || clean.startsWith("data:") || clean.startsWith("javascript:"))
    return null;
  if (clean.startsWith("//")) return `https:${clean}`;
  try {
    return new URL(clean, base).toString();
  } catch {
    return null;
  }
}

function inferRetailCategory(label: string | null): RetailCategory {
  const l = (label || "").toLowerCase();
  if (/headlight|tail\s*light|lamp|fog\s*light|xenon|multi-beam|led/i.test(l))
    return "lighting";
  if (/smash|bumper|fender|bonnet|hood|door|panel|grille|mirror\s*cap/i.test(l))
    return "body-panel";
  if (/glass|windscreen|window/i.test(l)) return "glass";
  if (/filter/i.test(l)) return "filter";
  if (/wheel|rim|tyre|tire/i.test(l)) return "wheel";
  if (/accessor/i.test(l)) return "accessory";
  return "other-retail";
}

async function fetchZarUsdRate(): Promise<number> {
  const env = process.env.BDSPARES_ZAR_USD_RATE;
  if (env && Number.isFinite(Number(env)) && Number(env) > 0) {
    return Number(env);
  }
  const r = await fetch("https://api.frankfurter.app/latest?from=ZAR&to=USD");
  if (!r.ok) {
    throw new Error(`Frankfurter API ${r.status}`);
  }
  const j = (await r.json()) as { rates?: { USD?: number } };
  const usd = j.rates?.USD;
  if (!usd || !Number.isFinite(usd)) {
    throw new Error("Frankfurter response missing rates.USD");
  }
  return usd;
}

function parseZarFromText(text: string): number | null {
  const cleaned = text.replace(/[^\d,.]/g, "").replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractMaxPaginationPage(html: string): number {
  let max = 1;
  const re = /\/page\/(\d+)\/?/gi;
  let m: RegExpExecArray | null = re.exec(html);
  while (m) {
    const p = Number.parseInt(m[1] ?? "1", 10);
    if (p > max) max = p;
    m = re.exec(html);
  }
  return max;
}

function listingPageUrl(baseListingUrl: string, page: number): string {
  const u = baseListingUrl.replace(/\/$/, "");
  if (page <= 1) return `${u}/`;
  return `${u}/page/${page}/`;
}

function extractShopProductUrls(html: string, pageUrl: string): string[] {
  const out = new Set<string>();
  const re = /href=["']([^"']*\/shop\/[^"'#?]+)\/?["']/gi;
  let m: RegExpExecArray | null = re.exec(html);
  while (m) {
    const resolved = resolveUrl(m[1], pageUrl);
    if (resolved && /\/shop\//.test(resolved) && !/\/shop\/?$/.test(resolved)) {
      const noQuery = resolved.split("?")[0].replace(/\/$/, "");
      out.add(`${noQuery}/`);
    }
    m = re.exec(html);
  }
  return [...out];
}

function extractBrandSlugsFromIndex(html: string): string[] {
  const slugs = new Set<string>();
  const re = /href=["'](?:https?:\/\/[^"']+)?\/brands\/([a-z0-9-]+)\/?["']/gi;
  let m: RegExpExecArray | null = re.exec(html);
  while (m) {
    const s = m[1]?.toLowerCase();
    if (s && !BRAND_SLUG_DENYLIST.has(s)) slugs.add(s);
    m = re.exec(html);
  }
  return [...slugs].sort();
}

function extractLineSlugs(
  html: string,
  brandSlug: string,
): { slug: string; title: string }[] {
  const lines: { slug: string; title: string }[] = [];
  const seen = new Set<string>();
  const esc = brandSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `href=["'](?:https?:\\/\\/[^"']+)?\\/brands\\/${esc}\\/([a-z0-9-]+)\\/?["']`,
    "gi",
  );
  let m: RegExpExecArray | null = re.exec(html);
  while (m) {
    const lineSlug = m[1]?.toLowerCase();
    if (!lineSlug || seen.has(lineSlug)) {
      m = re.exec(html);
      continue;
    }
    seen.add(lineSlug);
    const title = lineSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    lines.push({ slug: lineSlug, title });
    m = re.exec(html);
  }
  return lines;
}

function extractLdJsonProduct(html: string): {
  price?: string;
  currency?: string;
  name?: string;
  image?: string | string[];
} | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        if (
          o["@type"] === "Product" ||
          (Array.isArray(o["@type"]) && o["@type"]?.includes("Product"))
        ) {
          const offers = o.offers as Record<string, unknown> | undefined;
          const price =
            offers?.price != null ? String(offers.price) : undefined;
          const currency =
            offers?.priceCurrency != null
              ? String(offers.priceCurrency)
              : undefined;
          const name = o.name != null ? String(o.name) : undefined;
          const image = o.image as string | string[] | undefined;
          return { price, currency, name, image };
        }
      }
    } catch {
      /* skip invalid JSON */
    }
  }
  return null;
}

/** Drop JSON-LD glitches (e.g. POS_BDDDDDDDDDDDD4687.jpg) and non-upload URLs. */
function isPlausibleBdSparesImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname;
    if (!/\/wp-content\/uploads\//i.test(pathname)) return false;
    if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(pathname)) return false;
    const base = pathname.split("/").pop() ?? "";
    if (/(.)\1{7,}/.test(base)) return false;
    if (base.length > 180) return false;
    return true;
  } catch {
    return false;
  }
}

/** WordPress often 404s `-scaled` or `-1200x800` while the full file exists. */
function wordPressImageFallbacks(url: string): string[] {
  const out: string[] = [];
  const add = (u: string) => {
    const s = u.split("#")[0].trim();
    if (s && !out.includes(s)) out.push(s);
  };
  add(url);
  add(url.replace(/-scaled(\.(jpe?g|png|webp|gif))(\?.*)?$/i, "$1$2"));
  add(url.replace(/-\d+x\d+(\.(jpe?g|png|webp|gif))(\?.*)?$/i, "$1$2"));
  return out;
}

function extractProductDetail(html: string, pageUrl: string): BdProductDetail {
  const ld = extractLdJsonProduct(html);

  const h1 =
    html.match(
      /<h1[^>]*class=["'][^"']*product_title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i,
    )?.[1] ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const name =
    normalizeSpace(stripTags(h1 || ld?.name || "")) || "Untitled part";

  let priceZar: number | null = null;
  if (ld?.price && (!ld.currency || ld.currency === "ZAR")) {
    priceZar = parseZarFromText(ld.price);
  }
  if (priceZar == null) {
    const priceBlock =
      html.match(
        /<p[^>]*class=["'][^"']*price[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
      )?.[1] ?? "";
    const amount =
      priceBlock.match(
        /woocommerce-Price-amount[^>]*>([\s\S]*?)<\/span>/i,
      )?.[1] ?? priceBlock;
    priceZar = parseZarFromText(stripTags(amount));
  }

  const inStock = /in\s+stock/i.test(html) && !/out\s+of\s+stock/i.test(html);

  const shortDesc =
    html.match(
      /woocommerce-product-details__short-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    )?.[1] ??
    html.match(
      /<div[^>]*itemprop=["']description["'][^>]*>([\s\S]*?)<\/div>/i,
    )?.[1];
  const description = shortDesc ? normalizeSpace(stripTags(shortDesc)) : null;

  const dimRow = html.match(/Dimensions[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/i);
  const dimensions = dimRow?.[1] ? normalizeSpace(stripTags(dimRow[1])) : null;

  const oemMatch = html.match(/OEM\s*Part\s*Number:?\s*<\/[^>]+>\s*([^<]+)/i);
  const oemPartNumber = oemMatch?.[1]
    ? normalizeSpace(stripTags(oemMatch[1]))
    : null;

  const alternates: string[] = [];
  const altRe = /Alternate\s*Part\s*Number\s*\d*:?\s*<\/[^>]+>\s*([^<]+)/gi;
  let am: RegExpExecArray | null = altRe.exec(html);
  while (am) {
    const v = normalizeSpace(stripTags(am[1] || ""));
    if (v) alternates.push(v);
    am = altRe.exec(html);
  }

  const skuMatch =
    html.match(/SKU:?\s*<\/[^>]+>\s*([^<]+)/i) ??
    html.match(/SKU:\s*([A-Za-z0-9-]+)/i);
  const sku = skuMatch?.[1] ? normalizeSpace(stripTags(skuMatch[1])) : null;

  const catMatch = html.match(/Category:?\s*<\/[^>]+>\s*([^<]+)/i);
  const woocommerceCategory = catMatch?.[1]
    ? normalizeSpace(stripTags(catMatch[1]))
    : null;

  const brandMatch = html.match(/Brand:?\s*<\/[^>]+>\s*([^<]+)/i);
  const woocommerceBrandLabel = brandMatch?.[1]
    ? normalizeSpace(stripTags(brandMatch[1]))
    : null;

  const pathSlug =
    new URL(pageUrl).pathname.replace(/\/$/, "").split("/").pop() ||
    slugifySegment(name);

  const imageUrls: string[] = [];
  if (ld?.image) {
    const imgs = Array.isArray(ld.image) ? ld.image : [ld.image];
    for (const im of imgs) {
      const resolved = resolveUrl(im, pageUrl);
      if (resolved && isPlausibleBdSparesImageUrl(resolved))
        imageUrls.push(resolved);
    }
  }
  const og = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  )?.[1];
  if (og) {
    const r = resolveUrl(og, pageUrl);
    if (r && isPlausibleBdSparesImageUrl(r)) imageUrls.unshift(r);
  }
  const dataLarge = html.matchAll(/data-large_image\s*=\s*["']([^"']+)["']/gi);
  for (const m of dataLarge) {
    const resolved = resolveUrl(m[1] ?? "", pageUrl);
    if (resolved && isPlausibleBdSparesImageUrl(resolved))
      imageUrls.push(resolved);
  }
  const uniq = [...new Set(imageUrls)];

  return {
    sourceUrl: pageUrl,
    name,
    slug: pathSlug,
    sku,
    priceZar,
    inStock,
    description,
    dimensions,
    oemPartNumber,
    alternatePartNumbers: alternates,
    woocommerceCategory,
    woocommerceBrandLabel,
    imageUrls: uniq,
  };
}

async function getHtml(
  browser: Browser,
  url: string,
  delayMs: number,
): Promise<string> {
  const page: Page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    );
    // Some B+D pages (notably `/brands/accessories/`) keep network connections
    // open (analytics, long-polling), so `networkidle2` may never be reached.
    // We retry with `domcontentloaded` if the initial navigation times out.
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 120_000 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Navigation timeout")) {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
      } else {
        throw e;
      }
    }
    await sleep(delayMs);
    return await page.content();
  } finally {
    await page.close();
  }
}

function resolveBrandRef(
  brands: SanityBrand[],
  brandSlug: string,
): string | undefined {
  const slugHit = brands.find(
    (b) => (b.slug || "").toLowerCase() === brandSlug,
  );
  if (slugHit) return slugHit._id;
  const guess = brandSlug.replace(/-/g, " ").toLowerCase();
  return brands.find(
    (b) => b.title.toLowerCase().replace(/\s+/g, " ") === guess,
  )?._id;
}

const imageAssetByUrl = new Map<string, string>();

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function filenameFromUrl(imageUrl: string): string {
  const pathname = new URL(imageUrl).pathname;
  const name = pathname.split("/").pop() || "part.jpg";
  return name.includes(".") ? name : `${name}.jpg`;
}

async function downloadImageBufferNode(
  imageUrl: string,
  refererPageUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  let origin: string;
  try {
    origin = new URL(refererPageUrl).origin;
  } catch {
    origin = new URL(BASE).origin;
  }
  const response = await fetch(imageUrl, {
    headers: {
      "user-agent": CHROME_UA,
      referer: refererPageUrl,
      origin,
      accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType };
}

/**
 * After `page.goto(productUrl)`, in-page fetch(image) sends Referer/cookies like a real shopper (avoids wp-content 403).
 */
type InPageImageFetchResult =
  | { ok: false; status: number; ct: string; bytes: number[] }
  | { ok: true; status: number; ct: string; bytes: number[] };

async function downloadImageBufferInPage(
  page: Page,
  imageUrl: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  // No async/inner named arrows here: tsx/esbuild injects __name() into the
  // serialized function; it runs in Chromium and throws ReferenceError.
  const result = (await page.evaluate((u) => {
    return fetch(String(u)).then(function (r): Promise<InPageImageFetchResult> {
      const ct = r.headers.get("content-type") || "image/jpeg";
      if (!r.ok) {
        return Promise.resolve({
          ok: false,
          status: r.status,
          ct,
          bytes: [],
        });
      }
      return r.arrayBuffer().then(function (ab) {
        return {
          ok: true,
          status: r.status,
          ct,
          bytes: Array.from(new Uint8Array(ab)),
        };
      });
    });
  }, imageUrl)) as unknown as InPageImageFetchResult;

  if (!result.ok) {
    throw new Error(`in-page fetch HTTP ${result.status}`);
  }
  const contentType = result.ct.split(";")[0]?.trim() || "image/jpeg";
  return { buffer: Buffer.from(result.bytes), contentType };
}

async function collectLiveGalleryImageUrls(page: Page): Promise<string[]> {
  const raw = await page.evaluate(() => {
    const found: string[] = [];
    const sel =
      ".woocommerce-product-gallery img, .woocommerce-product-gallery__image img, .product-images img, .wd-gallery-item img, [class*='product-gallery'] img";
    const nodes = document.querySelectorAll(sel);
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (!(el instanceof HTMLImageElement)) continue;
      const candidates = [
        el.getAttribute("data-large_image"),
        el.getAttribute("data-src"),
        el.getAttribute("src"),
        el.currentSrc,
      ];
      for (let j = 0; j < candidates.length; j++) {
        const u = candidates[j];
        if (!u || typeof u !== "string") continue;
        const t = u.split("#")[0].trim();
        if (t.includes("wp-content/uploads")) found.push(t);
      }
    }
    return [...new Set(found)];
  });
  return raw.filter(isPlausibleBdSparesImageUrl);
}

function findCachedAssetIdForImage(imageUrl: string): string | undefined {
  for (const v of wordPressImageFallbacks(imageUrl)) {
    const id = imageAssetByUrl.get(v);
    if (id) return id;
  }
  return undefined;
}

async function downloadFirstWorkingImage(
  page: Page | null,
  imageUrl: string,
  refererPageUrl: string,
): Promise<{ buffer: Buffer; contentType: string; sourceUrl: string }> {
  const variants = wordPressImageFallbacks(imageUrl);
  let lastErr: unknown;
  for (const v of variants) {
    if (page) {
      try {
        const r = await downloadImageBufferInPage(page, v);
        return { ...r, sourceUrl: v };
      } catch (e) {
        lastErr = e;
      }
    }
    try {
      const r = await downloadImageBufferNode(v, refererPageUrl);
      return { ...r, sourceUrl: v };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

async function uploadImageToSanityFromBuffer(
  imageUrl: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!sanity) return null;
  const cached = imageAssetByUrl.get(imageUrl);
  if (cached) return cached;

  const filename = filenameFromUrl(imageUrl);
  const asset = await sanity.assets.upload("image", buffer, {
    filename,
    contentType: contentType || "image/jpeg",
  });
  imageAssetByUrl.set(imageUrl, asset._id);
  return asset._id;
}

async function buildGallery(
  imageUrls: string[],
  refererPageUrl: string,
  browser: Browser | null,
): Promise<
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
  const storedFiltered = imageUrls.filter(isPlausibleBdSparesImageUrl);

  if (!sanity) {
    return gallery;
  }

  if (browser) {
    const page = await browser.newPage();
    try {
      await page.setUserAgent(CHROME_UA);
      await page.goto(refererPageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await sleep(500);
      const liveUrls = await collectLiveGalleryImageUrls(page);
      const merged = [...new Set([...liveUrls, ...storedFiltered])];
      const max = Math.min(merged.length, 6);
      if (max === 0) {
        return gallery;
      }

      for (let i = 0; i < max; i += 1) {
        const imageUrl = merged[i];
        const cachedRef = findCachedAssetIdForImage(imageUrl);
        if (cachedRef) {
          gallery.push({
            _type: "object",
            _key: `img${i}`,
            image: {
              _type: "image",
              asset: { _type: "reference", _ref: cachedRef },
            },
          });
          continue;
        }
        try {
          const { buffer, contentType, sourceUrl } =
            await downloadFirstWorkingImage(page, imageUrl, refererPageUrl);
          const assetId = await uploadImageToSanityFromBuffer(
            sourceUrl,
            buffer,
            contentType,
          );
          if (assetId) {
            gallery.push({
              _type: "object",
              _key: `img${i}`,
              image: {
                _type: "image",
                asset: { _type: "reference", _ref: assetId },
              },
            });
          }
        } catch (e) {
          console.warn(`Image upload failed ${imageUrl}: ${String(e)}`);
        }
      }
    } finally {
      await page.close();
    }
    return gallery;
  }

  const max = Math.min(storedFiltered.length, 6);
  for (let i = 0; i < max; i += 1) {
    const imageUrl = storedFiltered[i];
    const cachedRef = findCachedAssetIdForImage(imageUrl);
    if (cachedRef) {
      gallery.push({
        _type: "object",
        _key: `img${i}`,
        image: {
          _type: "image",
          asset: { _type: "reference", _ref: cachedRef },
        },
      });
      continue;
    }
    try {
      const { buffer, contentType, sourceUrl } =
        await downloadFirstWorkingImage(null, imageUrl, refererPageUrl);
      const assetId = await uploadImageToSanityFromBuffer(
        sourceUrl,
        buffer,
        contentType,
      );
      if (assetId) {
        gallery.push({
          _type: "object",
          _key: `img${i}`,
          image: {
            _type: "image",
            asset: { _type: "reference", _ref: assetId },
          },
        });
      }
    } catch (e) {
      console.warn(`Image upload failed ${imageUrl}: ${String(e)}`);
    }
  }
  return gallery;
}

async function loadBrands(): Promise<SanityBrand[]> {
  if (!sanity) return [];
  return sanity.fetch<SanityBrand[]>(
    `*[_type == "brand"]{ _id, title, "slug": slug.current }`,
  );
}

async function upsertCarPartCategory(key: RetailCategory): Promise<string | null> {
  if (!sanity) return null;
  const docId = `carPartCategory-${key}`.slice(0, 128);
  const titleByKey: Record<RetailCategory, string> = {
    lighting: "Lighting",
    "body-panel": "Body / panels",
    glass: "Glass",
    filter: "Filters",
    wheel: "Wheels",
    accessory: "Accessories",
    "other-retail": "Other retail",
  };
  const title = titleByKey[key] ?? key;
  await sanity.createOrReplace({
    _id: docId,
    _type: "carPartCategory",
    title,
    slug: {
      _type: "slug",
      current: slugifySegment(title),
    },
    sourceKey: key,
    order: 0,
  });
  return docId;
}

async function upsertSparePartLine(
  job: LineJob,
  brandRef: string | undefined,
): Promise<string | undefined> {
  if (!sanity || !brandRef) return undefined;
  const docId = `sparePartLine-bd-${job.path.replace(/\//g, "-")}`.slice(
    0,
    128,
  );
  const slugCurrent = job.lineSlug;
  await sanity.createOrReplace({
    _id: docId,
    _type: "sparePartLine",
    title: job.lineTitle,
    slug: { _type: "slug", current: slugCurrent },
    brand: { _type: "reference", _ref: brandRef },
    path: job.path,
    sourceUrl: job.listingUrl,
    order: 0,
  });
  return docId;
}

async function upsertCarPart(
  detail: BdProductDetail,
  ctx: {
    lineJob: LineJob;
    sparePartLineId: string | undefined;
    brandRef: string | undefined;
    brandTitleForFilter: string;
    category: RetailCategory;
    zarUsd: number;
    imageBrowser: Browser | null;
  },
): Promise<void> {
  if (!sanity) return;

  const skuKey = detail.sku || detail.slug;
  const docId = `carPart-bd-${slugifySegment(skuKey)}`.slice(0, 128);

  const partNumber = detail.oemPartNumber || detail.sku || skuKey;
  const slugBase =
    `${slugifySegment(detail.name)}-${slugifySegment(skuKey)}`.slice(0, 90);

  let usd: number | undefined;
  if (detail.priceZar != null && detail.priceZar > 0) {
    usd = Math.round(detail.priceZar * ctx.zarUsd * 100) / 100;
  }

  const gallery = await buildGallery(
    detail.imageUrls,
    detail.sourceUrl,
    ctx.imageBrowser,
  );

  const carPartCategoryId = await upsertCarPartCategory(ctx.category);

  const doc = {
    _id: docId,
    _type: "carPart" as const,
    name: detail.name,
    partNumber,
    ...(carPartCategoryId
      ? { category: { _type: "reference" as const, _ref: carPartCategoryId } }
      : {}),
    ...(ctx.brandRef
      ? { brand: { _type: "reference" as const, _ref: ctx.brandRef } }
      : {}),
    legacyCategoryKey: ctx.category,
    legacyBrandText: ctx.brandTitleForFilter,
    ...(detail.woocommerceCategory != null && detail.woocommerceCategory !== ""
      ? { woocommerceCategory: detail.woocommerceCategory }
      : {}),
    ...(detail.alternatePartNumbers.length > 0
      ? { alternatePartNumbers: detail.alternatePartNumbers }
      : {}),
    sourceVendor: "bdspares" as const,
    sourceUrl: detail.sourceUrl,
    ...(detail.sku != null && detail.sku !== ""
      ? { sourceSku: detail.sku }
      : {}),
    ...(detail.priceZar != null ? { priceZar: detail.priceZar } : {}),
    exchangeRateZarUsd: ctx.zarUsd,
    ...(detail.description != null && detail.description !== ""
      ? { description: detail.description }
      : {}),
    inStock: detail.inStock,
    isOnSale: false as const,
    slug: { _type: "slug" as const, current: slugBase || docId },
    publishedAt: new Date().toISOString(),
    ...(detail.dimensions != null && detail.dimensions !== ""
      ? { specifications: { dimensions: detail.dimensions } }
      : {}),
    ...(gallery.length > 0 ? { gallery } : {}),
    compatibleVehicles: [
      {
        brand: ctx.brandTitleForFilter,
        model: ctx.lineJob.lineTitle,
      },
    ],
    ...(usd != null
      ? { priceRange: { min: usd, max: usd, currency: "USD" as const } }
      : {}),
    ...(ctx.sparePartLineId != null
      ? {
          sparePartLine: {
            _type: "reference" as const,
            _ref: ctx.sparePartLineId,
          },
        }
      : {}),
  };

  await sanity.createOrReplace(doc);
}

async function collectLineJobs(
  browser: Browser,
  options: CliOptions,
): Promise<LineJob[]> {
  const jobs: LineJob[] = [];
  const indexHtml = await getHtml(browser, `${BASE}/brands/`, options.delayMs);
  let brandSlugs = extractBrandSlugsFromIndex(indexHtml);
  if (options.excludeBrandSlugs.size > 0) {
    const before = brandSlugs.length;
    brandSlugs = brandSlugs.filter((s) => !options.excludeBrandSlugs.has(s));
    console.log(
      `Excluded ${before - brandSlugs.length} brand(s): ${[...options.excludeBrandSlugs].join(", ")}`,
    );
  }
  if (options.brandFilter) {
    brandSlugs = brandSlugs.filter((s) => s === options.brandFilter);
    // "accessories" and similar are stripped in extractBrandSlugsFromIndex (denylist)
    // so full crawls skip non-vehicle hubs — but /brands/accessories/ still exists; see
    // https://www.bdspares.co.za/brands/accessories/
    if (brandSlugs.length === 0) {
      brandSlugs = [options.brandFilter];
      console.log(
        `Brand "${options.brandFilter}" not in index list; crawling /brands/${options.brandFilter}/ (explicit --brand=).`,
      );
    }
  }
  console.log(`Brands to scan: ${brandSlugs.length}`);

  for (const brandSlug of brandSlugs) {
    const brandUrl = `${BASE}/brands/${brandSlug}/`;
    const bHtml = await getHtml(browser, brandUrl, options.delayMs);
    const lines = extractLineSlugs(bHtml, brandSlug);
    const filteredLines = options.lineFilter
      ? lines.filter((l) => l.slug === options.lineFilter)
      : lines;
    for (const { slug: lineSlug, title: lineTitle } of filteredLines) {
      jobs.push({
        brandSlug,
        lineSlug,
        path: `${brandSlug}/${lineSlug}`,
        listingUrl: `${BASE}/brands/${brandSlug}/${lineSlug}/`,
        lineTitle,
      });
    }
    console.log(`  ${brandSlug}: ${filteredLines.length} lines`);
  }
  return jobs;
}

async function scrapeLineProducts(
  browser: Browser,
  job: LineJob,
  options: CliOptions,
): Promise<string[]> {
  const urls = new Set<string>();
  const firstHtml = await getHtml(browser, job.listingUrl, options.delayMs);
  const maxPage = Math.min(extractMaxPaginationPage(firstHtml), 500);
  for (let p = 1; p <= maxPage; p += 1) {
    const url = listingPageUrl(job.listingUrl, p);
    const html =
      p === 1 ? firstHtml : await getHtml(browser, url, options.delayMs);
    const found = extractShopProductUrls(html, url);
    for (const u of found) urls.add(u);
    if (found.length === 0 && p > 1) break;
  }
  return [...urls];
}

async function main() {
  const options = getCliOptions();
  const outParts = path.resolve(
    process.cwd(),
    "scripts",
    "output-bdspares-parts.json",
  );
  const outJobs = path.resolve(
    process.cwd(),
    "scripts",
    "output-bdspares-jobs.json",
  );

  if (!options.dryRun && !sanity) {
    console.error(
      "Set SANITY_API_TOKEN (or NEXT_PUBLIC_SANITY_API_TOKEN) or use --dry-run.",
    );
    process.exit(1);
  }

  const zarUsd = await fetchZarUsdRate();
  console.log(`ZAR→USD rate: ${zarUsd} (1 ZAR = ${zarUsd} USD)`);

  let details: Array<BdProductDetail & { lineJob: LineJob }> = [];

  if (options.fromOutput) {
    if (!fs.existsSync(outParts)) {
      console.error(`Missing ${outParts}`);
      process.exit(1);
    }
    details = JSON.parse(fs.readFileSync(outParts, "utf8")) as Array<
      BdProductDetail & { lineJob: LineJob }
    >;
    console.log(`Loaded ${details.length} detail rows from output.`);
  } else {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const jobs = await collectLineJobs(browser, options);
      fs.writeFileSync(outJobs, JSON.stringify(jobs, null, 2), "utf8");
      console.log(`Total line jobs: ${jobs.length} (saved ${outJobs})`);

      let productCount = 0;
      const seenProductUrls = new Set<string>();

      outer: for (const job of jobs) {
        const productUrls = await scrapeLineProducts(browser, job, options);
        console.log(`Line ${job.path}: ${productUrls.length} product URLs`);

        for (const pUrl of productUrls) {
          if (seenProductUrls.has(pUrl)) continue;
          seenProductUrls.add(pUrl);
          try {
            const html = await getHtml(browser, pUrl, options.delayMs);
            const detail = extractProductDetail(html, pUrl);
            details.push({ ...detail, lineJob: job });
            productCount += 1;
            if (options.limit && productCount >= options.limit) break outer;
          } catch (e) {
            console.warn(`Skip product ${pUrl}: ${String(e)}`);
          }
        }
        if (options.limit && productCount >= options.limit) break;
      }
    } finally {
      await browser.close();
    }
    fs.writeFileSync(outParts, JSON.stringify(details, null, 2), "utf8");
    console.log(`Wrote ${details.length} products to ${outParts}`);
  }

  if (options.limit && options.limit > 0) {
    details = details.slice(0, options.limit);
  }

  if (options.dryRun) {
    console.log("Dry run: skip Sanity upsert.");
    return;
  }

  const brands = await loadBrands();

  let imageBrowser: Browser | null = null;
  try {
    if (details.length > 0) {
      imageBrowser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      console.log(
        "Image downloads: using browser session + product-page Referer (avoids wp-content 403).",
      );
    }

    for (const row of details) {
      const { lineJob, ...detail } = row;
      const brandRef = resolveBrandRef(brands, lineJob.brandSlug);
      const brandTitleForFilter =
        brands.find((b) => b._id === brandRef)?.title ||
        lineJob.brandSlug
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

      const category = inferRetailCategory(detail.woocommerceCategory);
      const sparePartLineId = await upsertSparePartLine(lineJob, brandRef);

      try {
        await upsertCarPart(detail, {
          lineJob,
          sparePartLineId,
          brandRef,
          brandTitleForFilter,
          category,
          zarUsd,
          imageBrowser,
        });
        console.log(`Upsert ${detail.sku || detail.slug}: ${detail.name}`);
      } catch (e) {
        console.warn(`Upsert failed ${detail.sourceUrl}: ${String(e)}`);
      }
    }
  } finally {
    if (imageBrowser) {
      await imageBrowser.close();
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
