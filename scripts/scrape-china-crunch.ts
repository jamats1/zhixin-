/**
 * scrape-china-crunch.ts
 *
 * Scrapes PHEV (and optionally BEV) listings from:
 *   https://marketplace.china-crunch.com/collections/phev
 *
 * For each listing it:
 *   1. Extracts listing-card data (title, vendor/brand, price, product URL, image)
 *   2. Visits the detail page to extract extra metadata (fuel type, body, steering, quantity, location, variants)
 *   3. Upserts a `vehicle` document into Sanity using createOrReplace
 *
 * Run:
 *   npx tsx scripts/scrape-china-crunch.ts
 *   (Sanity token is read from NEXT_PUBLIC_SANITY_API_TOKEN in .env.local)
 */

import puppeteer, { type Browser, type Page } from "puppeteer";
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import * as path from "node:path";
import * as fs from "node:fs";

// ─── Load environment variables ────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SANITY_PROJECT_ID =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const SANITY_TOKEN = process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

if (!SANITY_TOKEN) {
    console.error(
        "❌  NEXT_PUBLIC_SANITY_API_TOKEN is missing from .env.local. Aborting."
    );
    process.exit(1);
}

const sanity = createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: "2024-01-01",
    token: SANITY_TOKEN,
    useCdn: false,
});

// ─── Config ────────────────────────────────────────────────────────────────────
const COLLECTION_URLS = [
    "https://marketplace.china-crunch.com/collections/phev",
    // Uncomment to also scrape BEV:
    // "https://marketplace.china-crunch.com/collections/bev",
];

const DELAY_MS = 1500; // polite delay between detail-page requests

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ListingCard {
    title: string;
    vendor: string;
    priceRaw: string;
    price: number | null;
    productUrl: string;
    imageUrl: string | null;
}

interface DetailData {
    fuelType: string | null;
    bodyType: string | null;
    steering: string | null;
    euTariff: string | null;
    availableQty: number | null;
    location: string | null;
    variants: string[];
    description: string | null;
}

interface VehicleListing extends ListingCard, DetailData { }

// ─── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrice(raw: string): number | null {
    const num = raw.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(num);
    return Number.isNaN(parsed) ? null : parsed;
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

// ─── Scraping ──────────────────────────────────────────────────────────────────
async function scrapeListingCards(
    page: Page,
    collectionUrl: string
): Promise<ListingCard[]> {
    console.log(`  → Loading collection: ${collectionUrl}`);
    await page.goto(collectionUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
    // Give the page extra time to render product grid (Shopify lazy-loads)
    await sleep(4000);

    const cards: ListingCard[] = await page.evaluate(() => {
        const items = Array.from(
            document.querySelectorAll(".bls__product-item, .product-item, article.product")
        );

        return items.map((el) => {
            // Title
            const titleEl =
                el.querySelector("h3.bls__product-name a") ||
                el.querySelector(".product-name a") ||
                el.querySelector("h3 a") ||
                el.querySelector("a.product-title");
            const title = titleEl?.textContent?.trim() || "";

            // Vendor / brand
            const vendorEl =
                el.querySelector(".bls__product-vendor a") ||
                el.querySelector(".product-vendor a") ||
                el.querySelector(".vendor a");
            const vendor = vendorEl?.textContent?.trim() || "";

            // Price
            const priceEl =
                el.querySelector(".price-item--regular") ||
                el.querySelector(".price-item") ||
                el.querySelector("[class*=price]");
            const priceRaw = priceEl?.textContent?.trim() || "";

            // Product URL
            const linkEl =
                (el.querySelector("h3.bls__product-name a") as HTMLAnchorElement) ||
                (el.querySelector("a.bls__img-url") as HTMLAnchorElement) ||
                (el.querySelector("a[href*='/products/']") as HTMLAnchorElement);
            const href = linkEl?.href || "";
            const productUrl = href.startsWith("http")
                ? href
                : href
                    ? `https://marketplace.china-crunch.com${href}`
                    : "";

            // Image
            const imgEl =
                el.querySelector("img[src]") ||
                el.querySelector("img[data-src]");
            const imageUrl =
                (imgEl as HTMLImageElement | null)?.src ||
                imgEl?.getAttribute("data-src") ||
                null;

            return { title, vendor, priceRaw, price: null, productUrl, imageUrl };
        });
    });

    // Filter empty entries and parse price
    return cards
        .filter((c) => c.title && c.productUrl)
        .map((c) => ({ ...c, price: parsePrice(c.priceRaw) }));
}

async function scrapeDetailPage(
    page: Page,
    url: string
): Promise<DetailData> {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await sleep(2000);

    return page.evaluate(() => {
        const getText = (sel: string) =>
            document.querySelector(sel)?.textContent?.trim() || null;

        // Meta tags: "Fuel Type", "Body", "Steering", "EU Tariff"
        const metaItems: Record<string, string> = {};
        document.querySelectorAll(".bls__product-meta span, .product-meta span, .product__meta span").forEach((span) => {
            const label = span.textContent?.trim();
            const value = span.nextElementSibling?.textContent?.trim();
            if (label && value) metaItems[label] = value;
        });

        // Also try definition-list style
        document.querySelectorAll("dt, th").forEach((dt) => {
            const label = dt.textContent?.trim() || "";
            const value = dt.nextElementSibling?.textContent?.trim() || "";
            if (label && value) metaItems[label] = value;
        });

        const fuelType =
            metaItems["Fuel Type"] || metaItems["Fuel type"] || null;
        const bodyType =
            metaItems["Body"] || metaItems["Body Type"] || null;
        const steering = metaItems["Steering"] || null;
        const euTariff = metaItems["EU Tariff"] || metaItems["EU tariff"] || null;

        // Available quantity
        const availableEl = document.querySelector(
            ".bls__available-number, [class*=available-number], [class*=inventory-qty]"
        );
        const availableText = availableEl?.textContent || "";
        const availableMatch = availableText.match(/\d+/);
        const availableQty = availableMatch ? parseInt(availableMatch[0], 10) : null;

        // Location
        const locationEl = document.querySelector(
            ".bls__inventory-location, [class*=location]"
        );
        const location = locationEl?.textContent?.trim() || null;

        // Variants (trim / colour options)
        const variants: string[] = [];
        document.querySelectorAll("fieldset.product-form__input label, .product-form__option label").forEach((label) => {
            const text = label.textContent?.trim();
            if (text) variants.push(text);
        });

        // Description
        const descEl = document.querySelector(
            ".product__description, .bls__product-description, [class*=product-description]"
        );
        const description = descEl?.textContent?.trim() || null;

        return {
            fuelType,
            bodyType,
            steering,
            euTariff,
            availableQty,
            location,
            variants,
            description,
        };
    });
}

// Extract year from title e.g. "Nio ET9 (2025)" or "BYD Seal 2025"
function extractYearFromTitle(title: string): number | null {
    const m = title.match(/\b(20\d{2})\b/);
    return m ? parseInt(m[1], 10) : null;
}

// Extract model name (e.g. "ET9", "Seal") when title looks like "Brand Model (Year)" or "Brand Model 2025"
function extractModelFromTitle(title: string): string | null {
    const withParen = title.match(/\s+([A-Za-z0-9]+)\s*\(\d{4}\)/);
    if (withParen) return withParen[1];
    const withYear = title.match(/\s+([A-Za-z0-9]+)\s+20\d{2}/);
    if (withYear) return withYear[1];
    return null;
}

// ─── Sanity ingestion ──────────────────────────────────────────────────────────
async function upsertVehicle(listing: VehicleListing): Promise<void> {
    const titleSlug = slugify(listing.title);
    const docId = `cc-vehicle-${titleSlug}`;

    const doc = {
        _type: "vehicle",
        _id: docId,
        title: listing.title,
        slug: { _type: "slug", current: titleSlug },
        model: extractModelFromTitle(listing.title) ?? listing.title,
        year: extractYearFromTitle(listing.title),
        fuelType: listing.fuelType || "PHEV",
        bodyType: listing.bodyType ?? undefined,
        price: listing.price ?? undefined,
        isOnSale: true,
        isNewEnergy: true,
        features: listing.variants.length > 0 ? listing.variants : undefined,
        sku: `CC-${titleSlug.toUpperCase().substring(0, 24)}`,
        scrapedAt: new Date().toISOString().slice(0, 10),
    };

    try {
        await sanity.createOrReplace(doc);
        console.log(`  ✅  Upserted: ${listing.title}`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌  Failed to upsert "${listing.title}": ${msg}`);
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log("🚗  China Crunch PHEV Scraper");
    console.log("─".repeat(50));

    const browser: Browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const allListings: VehicleListing[] = [];

    try {
        const page = await browser.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        );
        await page.setViewport({ width: 1280, height: 900 });

        for (const collectionUrl of COLLECTION_URLS) {
            console.log(`\n📋  Collection: ${collectionUrl}`);
            const cards = await scrapeListingCards(page, collectionUrl);
            console.log(`  Found ${cards.length} listing cards`);

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                console.log(`\n[${i + 1}/${cards.length}] ${card.title}`);
                console.log(`  URL: ${card.productUrl}`);

                await sleep(DELAY_MS);
                const detail = await scrapeDetailPage(page, card.productUrl);

                const listing: VehicleListing = { ...card, ...detail };
                allListings.push(listing);
                await upsertVehicle(listing);
            }
        }
    } finally {
        await browser.close();
    }

    // Save raw output for debugging
    const outPath = path.resolve(process.cwd(), "scripts", "output-china-crunch.json");
    fs.writeFileSync(outPath, JSON.stringify(allListings, null, 2), "utf8");
    console.log(`\n💾  Raw data saved to ${outPath}`);
    console.log(`\n✅  Done! ${allListings.length} listings processed.`);
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
