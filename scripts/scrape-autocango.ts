/**
 * scrape-autocango.ts
 *
 * Scrapes used car listings from https://www.autocango.com/usedcar
 *
 * Strategy:
 *   1. Iterate paginated listing pages (/usedcar?page=N) to collect listing URLs
 *   2. For each listing URL, scrape the detail page for full specs
 *   3. Upsert a `vehicle` document into Sanity using createOrReplace
 *
 * NOTE on Auto Parts:
 *   The AutoCango /parts section is an inquiry-only form (no public catalogue).
 *   No individual part listings exist to scrape. If a parts catalogue becomes
 *   available, see the commented-out `scrapePartsSection` skeleton below.
 *
 * Run:
 *   npx tsx scripts/scrape-autocango.ts
 *   (Sanity token is read from NEXT_PUBLIC_SANITY_API_TOKEN in .env.local)
 */

import puppeteer, { type Browser, type Page } from "puppeteer";
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import * as path from "node:path";
import * as fs from "node:fs";
import * as https from "node:https";

// ─── Load environment variables ────────────────────────────────────────────────
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SANITY_PROJECT_ID =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const SANITY_TOKEN =
    process.env.NEXT_PUBLIC_SANITY_API_TOKEN || process.env.SANITY_API_TOKEN;

if (!SANITY_TOKEN) {
    console.error(
        "❌  NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN is required. Aborting."
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
const BASE_URL = "https://www.autocango.com";
const LISTING_BASE = `${BASE_URL}/usedcar`;
const BRANDS_URL = `${BASE_URL}/ucbrand`;
// Global safety cap for legacy list scraping (not used for brand pagination any more)
const MAX_PAGES = 20;
// How many pages we are willing to traverse per brand when walking pagination
const MAX_PAGES_PER_BRAND = 300;
// Optional per-run override via CLI, e.g. --pages=80-100 or --pages=100
type PageRangeOverride = { start?: number; end?: number } | undefined;
const DELAY_MS = 2000; // Polite crawl delay (site is slow)
const PAGE_TIMEOUT = 60_000;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CarListing {
    detailUrl: string;
    title: string;
    imageUrl: string | null;
}

interface CarDetail {
    title: string;
    brand: string | null;
    model: string | null;
    sku: string | null;
    price: number | null;
    year: number | null;
    registrationYear: string | null;
    mileage: number | null;
    fuelType: string | null;
    transmission: string | null;
    engineDisplacement: string | null;
    bodyType: string | null;
    seats: number | null;
    doors: number | null;
    drivetrain: string | null;
    batteryCapacityKwh: number | null;
    rangeKm: number | null;
    features: string[];
    imageUrl: string | null;
    imageUrls: string[];
    detailUrl: string;
}

interface BrandScraped {
    name: string;
    count: number;
    logoUrl: string | null;
}

type VehicleCategoryDoc = {
    _id: string;
    title: string;
    slug?: string;
};

type VehicleTypeDoc = {
    _id: string;
    title: string;
    slug?: string;
    category?: { _id: string };
};

let cachedVehicleCategories: VehicleCategoryDoc[] | null = null;
let cachedVehicleTypes: VehicleTypeDoc[] | null = null;
let cachedBrandDocs:
    | { _id: string; title: string; slug?: string }[]
    | null = null;

async function loadVehicleTaxonomy() {
    if (!cachedVehicleCategories) {
        cachedVehicleCategories = await sanity.fetch<VehicleCategoryDoc[]>(
            `*[_type == "vehicleCategory"]{ _id, title, "slug": slug.current }`
        );
    }
    if (!cachedVehicleTypes) {
        cachedVehicleTypes = await sanity.fetch<VehicleTypeDoc[]>(
            `*[_type == "vehicleType"]{ _id, title, "slug": slug.current, "category": category->{ _id } }`
        );
    }
    return {
        categories: cachedVehicleCategories,
        types: cachedVehicleTypes,
    };
}

async function loadBrandDocs() {
    if (!cachedBrandDocs) {
        cachedBrandDocs = await sanity.fetch<
            { _id: string; title: string; slug?: string }[]
        >(`*[_type == "brand"]{ _id, title, "slug": slug.current }`);
    }
    return cachedBrandDocs;
}

function inferCategorySlugFromBodyType(bodyType: string | null): string {
    if (!bodyType) return "cars";
    const bt = bodyType.toLowerCase();
    if (bt.includes("suv")) return "suvs";
    if (bt.includes("mpv")) return "mpvs";
    if (bt.includes("pickup") || bt.includes("pick-up")) return "pickup";
    if (bt.includes("truck")) return "minitruck";
    if (bt.includes("van") || bt.includes("minivan")) return "minivan";
    if (bt.includes("sport") || bt.includes("coupe")) return "sports";
    return "cars";
}

function inferTypeSlugFromBodyType(bodyType: string | null): string | null {
    if (!bodyType) return null;
    const bt = bodyType.toLowerCase();
    if (bt.includes("suv")) return "suv";
    if (bt.includes("mpv")) return "mpv";
    if (bt.includes("pickup") || bt.includes("pick-up")) return "pickup";
    if (bt.includes("truck")) return "truck";
    if (bt.includes("van") || bt.includes("minivan")) return "minivan";
    if (bt.includes("sport") || bt.includes("coupe")) return "sports";
    return null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

function parseNum(text: string | null | undefined): number | null {
    if (!text) return null;
    const n = parseFloat(text.replace(/[^0-9.]/g, ""));
    return Number.isNaN(n) ? null : n;
}

/** Extract SKU from autocango detail URL pattern: /sku/usedcar-Brand-Model-SKU */
function extractSku(url: string): string | null {
    const match = url.match(/\/sku\/usedcar-[^/]+-([A-Z]{3}\d+)$/i);
    return match ? match[1] : null;
}

/** Extract brand from URL: /sku/usedcar-{Brand}-{Model}-{SKU} */
function extractBrandFromUrl(url: string): string | null {
    const match = url.match(/\/sku\/usedcar-([^-]+)-/i);
    return match ? match[1] : null;
}

// ─── Listing page scraping ─────────────────────────────────────────────────────
async function scrapeListingPage(
    page: Page,
    pageNum: number
): Promise<{ listings: CarListing[]; hasNext: boolean }> {
    const url = pageNum === 1 ? LISTING_BASE : `${LISTING_BASE}?page=${pageNum}`;
    console.log(`  → Listing page ${pageNum}: ${url}`);

    try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
        await sleep(1500);
    } catch (err) {
        console.warn(`  ⚠  Timeout loading listing page ${pageNum}. Skipping.`);
        return { listings: [], hasNext: false };
    }

    const result = await page.evaluate((baseUrl: string) => {
        const items = Array.from(
            document.querySelectorAll("a.car-item, .car-list a, .car-card a, li.car a")
        );

        const listings = items
            .map((el) => {
                const anchor = el as HTMLAnchorElement;
                const href = anchor.href || "";
                const detailUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
                const title =
                    anchor.getAttribute("title") ||
                    anchor.querySelector("h3, h2, .title")?.textContent?.trim() ||
                    "";
                const imgEl = anchor.querySelector("img");
                const imageUrl =
                    imgEl?.getAttribute("src") ||
                    imgEl?.getAttribute("data-src") ||
                    null;
                return { detailUrl, title, imageUrl };
            })
            .filter((l) => l.detailUrl.includes("/sku/") || l.detailUrl.includes("/usedcar/"));

        // Detect next page: look for a "next" pagination link
        const nextBtn = document.querySelector(
            "a[rel='next'], .pagination a.next, .pager-next a, a.page-next"
        );
        const hasNext = !!nextBtn;

        return { listings, hasNext };
    }, BASE_URL);

    return result;
}

// ─── Detail page scraping ──────────────────────────────────────────────────────
async function scrapeDetailPage(page: Page, url: string): Promise<CarDetail | null> {
    try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: PAGE_TIMEOUT });
        await sleep(1000);
    } catch {
        console.warn(`  ⚠  Failed to load detail: ${url}`);
        return null;
    }

    // Use string-based evaluate to avoid TS helper issues (__name, etc.)
    return page.evaluate(`
      (function () {
        function getText(selectors) {
          var parts = selectors.split(",");
          for (var i = 0; i < parts.length; i++) {
            var sel = parts[i].trim();
            var el = document.querySelector(sel);
            if (el && el.textContent && el.textContent.trim()) {
              return el.textContent.trim();
            }
          }
          return null;
        }

        // Basic table-style specs (fallback)
        var specs = {};
        Array.prototype.forEach.call(
          document.querySelectorAll("tr, .spec-row, .info-row, dl"),
          function (row) {
            var cells = row.querySelectorAll("td, dt, dd, .label, .value");
            if (cells.length >= 2) {
              var label = (cells[0].textContent || "").trim();
              var value = (cells[1].textContent || "").trim();
              if (label) specs[label] = value;
            }
          }
        );

        var baseInfoEl = document.querySelector(".base-info");
        var baseInfoText = baseInfoEl && baseInfoEl.textContent
          ? baseInfoEl.textContent.replace(/\\s+/g, " ").trim()
          : "";

        // Prefer structure-based extraction: .base-info .item with .label + .value (AutoCango DOM)
        // so Engine(cc) yields "1998" (cc) not "3.5" (liters from elsewhere in the blob)
        var baseInfoMap = {};
        if (baseInfoEl) {
          var items = baseInfoEl.querySelectorAll(".item");
          items.forEach(function (itemEl) {
            var valueEl = itemEl.querySelector(".value") || itemEl.querySelector("p");
            var value = valueEl ? valueEl.textContent.trim() : "";
            var labelEl = itemEl.querySelector(".label, [class*=\\"label\\"]") ||
              (valueEl && valueEl.previousElementSibling) || itemEl.querySelector("span") || itemEl.children[0];
            var label = labelEl && labelEl !== valueEl ? labelEl.textContent.trim() : "";
            if (label) baseInfoMap[label] = value;
          });
        }
        function fromBaseInfo(label) {
          if (baseInfoMap[label]) return baseInfoMap[label];
          var key = Object.keys(baseInfoMap).find(function (k) {
            return k.replace(/\\s/g, "") === label.replace(/\\s/g, "");
          });
          return key ? baseInfoMap[key] : null;
        }

        var vehicleDetailsText = "";
        Array.prototype.some.call(
          document.querySelectorAll(".margin-top-24, .vehicle-details"),
          function (el) {
            if (el.textContent && el.textContent.indexOf("Vehicle Details") !== -1) {
              vehicleDetailsText = el.textContent.replace(/\\s+/g, " ").trim();
              return true;
            }
            return false;
          }
        );

        var accessoriesText = "";
        Array.prototype.some.call(
          document.querySelectorAll(".margin-top-24, .accessories"),
          function (el) {
            if (el.textContent && el.textContent.indexOf("Accessories") !== -1) {
              accessoriesText = el.textContent.replace(/\\s+/g, " ").trim();
              return true;
            }
            return false;
          }
        );

        function extractLabelValue(text, label) {
          if (!text) return null;
          // Allow zero or more spaces between label and value because AutoCango
          // often renders like "Reg. Year2025-03Mlg(km)7000FuelPetrol..."
          var re = new RegExp(label + "\\\\s*([^A-Z]+)", "i");
          var m = text.match(re);
          return m ? m[1].trim() : null;
        }

        // Features
        var featureTags = [];
        Array.prototype.forEach.call(
          document.querySelectorAll("span.tag, .feature-tag, .tag-item, .car-tag"),
          function (el) {
            var t = el.textContent && el.textContent.trim();
            if (t) featureTags.push(t);
          }
        );

        // Title
        var title =
          getText(".car-name") ||
          getText("h1, .car-title, .detail-title, .page-title") ||
          "Unknown";

        // Price
        var price = null;
        var priceCalcEl = document.querySelector(".price-calculator");
        if (priceCalcEl && priceCalcEl.textContent) {
          var pct = priceCalcEl.textContent.replace(/\\s+/g, " ").trim();
          var mPrice = pct.match(/Vehicle Price \\(?\\$?\\)：?([0-9,.]+)/);
          if (mPrice) {
            var n = parseFloat(mPrice[1].replace(/,/g, ""));
            if (!isNaN(n)) price = n;
          }
        }
        if (price === null) {
          var priceText = getText("span.price, .price-wrap .price, .car-price, [class*=price]");
          if (priceText) {
            var pn = parseFloat(priceText.replace(/[^0-9.]/g, ""));
            if (!isNaN(pn)) price = pn;
          }
        }

        // Images from gallery / carousel
        var imageEls = Array.prototype.slice.call(
          document.querySelectorAll(
            ".image-carousel img, .car-gallery img, .detail-img img, .swiper-slide img, .car-photo img, img.main-img"
          )
        );
        var imageUrls = [];
        imageEls.forEach(function (img) {
          var src = img.src || img.getAttribute("data-src") || "";
          if (src && imageUrls.indexOf(src) === -1) imageUrls.push(src);
        });
        var imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

        // Year
        var year = null;
        var ym = title.match(/\\b(20\\d{2})\\b/);
        if (ym) year = parseInt(ym[1], 10);

        function get(keys) {
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (specs[k]) return specs[k];
          }
          return null;
        }

        // Base specs – prefer .base-info .item structure (correct Engine(cc)=1998, not 3.5 from blob)
        var registrationYear =
          fromBaseInfo("Reg. Year") ||
          extractLabelValue(baseInfoText, "Reg\\. Year") ||
          extractLabelValue(vehicleDetailsText, "Reg\\. Year") ||
          get(["Registration", "Reg Year", "Reg.", "First Registration"]) ||
          null;

        var mileageRaw =
          fromBaseInfo("Mlg(km)") ||
          fromBaseInfo("Mileage") ||
          extractLabelValue(baseInfoText, "Mlg\\(km\\)") ||
          extractLabelValue(baseInfoText, "Mileage") ||
          extractLabelValue(vehicleDetailsText, "Mlg\\(km\\)") ||
          extractLabelValue(vehicleDetailsText, "Mileage") ||
          get(["Mileage", "Km", "KM", "Odometer"]);
        var mileage = null;
        if (mileageRaw) {
          var mv = parseFloat(String(mileageRaw).replace(/[^0-9.]/g, ""));
          if (!isNaN(mv)) mileage = mv;
        }

        var fuelType =
          fromBaseInfo("Fuel") ||
          extractLabelValue(baseInfoText, "Fuel") ||
          extractLabelValue(vehicleDetailsText, "Fuel") ||
          get(["Fuel Type", "Fuel", "Energy Type"]);

        var engineDisplacement =
          fromBaseInfo("Engine(cc)") ||
          fromBaseInfo("Engine (cc)") ||
          extractLabelValue(baseInfoText, "Engine\\(cc\\)") ||
          extractLabelValue(vehicleDetailsText, "Engine") ||
          get(["Engine", "Displacement", "Engine Displacement"]);

        var transmission =
          fromBaseInfo("Transm.") ||
          fromBaseInfo("Transmission") ||
          extractLabelValue(baseInfoText, "Transm\\.") ||
          extractLabelValue(vehicleDetailsText, "Transmission") ||
          get(["Transmission", "Gearbox", "Trans"]);

        var bodyType =
          extractLabelValue(baseInfoText, "Body\\s*Type") ||
          extractLabelValue(baseInfoText, "Body") ||
          extractLabelValue(vehicleDetailsText, "Body\\s*Type") ||
          extractLabelValue(vehicleDetailsText, "Body") ||
          get(["Body", "Body Type", "Style"]);

        var drivetrain =
          extractLabelValue(vehicleDetailsText, "Drivetrain") ||
          get(["Drivetrain", "Drive", "4WD/2WD"]);

        var batteryCapacityKwh = null;
        var batteryRaw =
          extractLabelValue(vehicleDetailsText, "Batt\\.Cap\\.\\(kWh\\)") ||
          get(["Batt.Cap.(kWh)", "Battery Capacity", "Battery(kWh)"]);
        if (batteryRaw) {
          var bcMatch = batteryRaw.match(/(\\d+(?:\\.\\d+)?)/);
          if (bcMatch) {
            var bc = parseFloat(bcMatch[1]);
            if (!isNaN(bc)) batteryCapacityKwh = bc;
          }
        }

        var rangeKm = null;
        var rangeRaw =
          extractLabelValue(vehicleDetailsText, "Range\\(km\\)") ||
          get(["Range(km)", "Range Km", "Range"]);
        if (rangeRaw) {
          var rMatch = rangeRaw.match(/(\\d+(?:\\.\\d+)?)/);
          if (rMatch) {
            var rv = parseFloat(rMatch[1]);
            if (!isNaN(rv)) rangeKm = rv;
          }
        }

        var seats = null;
        var seatsRaw =
          extractLabelValue(vehicleDetailsText, "Seats") ||
          get(["Seats", "Seating"]);
        if (seatsRaw) {
          var seatsMatch = seatsRaw.match(/(\\d+)/);
          if (seatsMatch) {
            var sv = parseInt(seatsMatch[1], 10);
            if (!isNaN(sv)) seats = sv;
          }
        }

        var doors = null;
        var doorsRaw =
          extractLabelValue(vehicleDetailsText, "Doors") ||
          get(["Doors"]);
        if (doorsRaw) {
          var dv = parseInt(doorsRaw, 10);
          if (!isNaN(dv)) doors = dv;
        }

        if (featureTags.length === 0 && accessoriesText) {
          var stripped = accessoriesText.replace(/^Accessories\\s*/i, "");
          stripped
            .split(/\\s{2,}/)
            .map(function (t) { return t.trim(); })
            .filter(function (t) { return t.length > 0; })
            .forEach(function (t) { featureTags.push(t); });
        }

        var detailUrl = window.location.href;

        var sku = null;
        var sm = detailUrl.match(/([A-Z]{3}\\d+)$/i);
        if (sm) sku = sm[1];

        var brand = null;
        var bm = detailUrl.match(/\\/sku\\/usedcar-([^-]+)-/i);
        if (bm) brand = bm[1];

        var model = null;
        var mm = detailUrl.match(/\\/sku\\/usedcar-[^-]+-(.+)-[A-Z]{3}\\d+$/i);
        if (mm) model = mm[1].replace(/-/g, " ");

        return {
          title: title,
          brand: brand,
          model: model,
          sku: sku,
          price: price,
          year: year,
          registrationYear: registrationYear,
          mileage: mileage,
          fuelType: fuelType,
          transmission: transmission,
          engineDisplacement: engineDisplacement,
          bodyType: bodyType,
          seats: seats,
          doors: doors,
          drivetrain: drivetrain,
          batteryCapacityKwh: batteryCapacityKwh,
          rangeKm: rangeKm,
          features: featureTags,
          imageUrl: imageUrl,
          imageUrls: imageUrls,
          detailUrl: detailUrl
        };
      })()
    `) as unknown as CarDetail;
}

// ─── Sanity ingestion ──────────────────────────────────────────────────────────
/** Build title for Sanity. Set AUTOCANGO_NORMALIZE_TITLE=1 to use "Brand Model (Year)" when possible. */
function vehicleTitleForSanity(detail: CarDetail): string {
    if (process.env.AUTOCANGO_NORMALIZE_TITLE === "1") {
        const brand = detail.brand?.trim() || "";
        const model = detail.model?.trim() || "";
        const year = detail.year != null ? String(detail.year) : "";
        const parts = [brand, model].filter(Boolean).join(" ");
        if (parts && year) return `${parts} (${year})`;
        if (parts) return parts;
        if (year) return year;
    }
    return detail.title;
}

async function upsertVehicle(detail: CarDetail): Promise<void> {
    const titleForDoc = vehicleTitleForSanity(detail);
    const baseId = detail.sku
        ? `ac-${detail.sku.toLowerCase()}`
        : `ac-${slugify(titleForDoc).substring(0, 40)}`;

    const slugCurrent = detail.sku
        ? slugify(`${detail.brand || ""}-${detail.model || ""}-${detail.sku}`)
        : slugify(titleForDoc);

    // Upload up to 8 images into Sanity and attach to the document
    const images: any[] = [];
    if (detail.imageUrls && detail.imageUrls.length > 0) {
        const limited = detail.imageUrls.slice(0, 8);
        for (let i = 0; i < limited.length; i++) {
            const url = limited[i];
            const img = await uploadImageFromUrl(
                url,
                `${slugCurrent || baseId}-img-${i + 1}.jpg`,
            );
            if (img) {
                images.push({
                    _key: `${baseId}-img-${i + 1}`,
                    ...img,
                });
            }
        }
    }

    const todayUtc = new Date().toISOString().slice(0, 10);

    // Resolve brand reference from Sanity brands, if possible
    let brandRefId: string | undefined;
    if (detail.brand && detail.brand.trim()) {
        try {
            const brands = await loadBrandDocs();
            const normalized = detail.brand.trim().toLowerCase();
            const brandDoc =
                brands.find(
                    (b) =>
                        b.title.trim().toLowerCase() === normalized ||
                        (b.slug && b.slug.toLowerCase() === slugify(normalized))
                ) || null;
            if (brandDoc) {
                brandRefId = brandDoc._id;
            }
        } catch {
            // If brand lookup fails, we just skip linking the reference
        }
    }

    // Infer category/type references based on bodyType using Sanity taxonomy
    let categoryRef: string | undefined;
    let typeRef: string | undefined;
    try {
        const { categories, types } = await loadVehicleTaxonomy();
        const desiredCategorySlug = inferCategorySlugFromBodyType(detail.bodyType);
        const desiredTypeSlug = inferTypeSlugFromBodyType(detail.bodyType);

        const categoryDoc =
            categories.find(
                (c) =>
                    (c.slug && c.slug.toLowerCase() === desiredCategorySlug) ||
                    c.title.toLowerCase() === desiredCategorySlug
            ) || null;
        if (categoryDoc) categoryRef = categoryDoc._id;

        if (desiredTypeSlug) {
            let candidateTypes = types;
            if (categoryDoc) {
                candidateTypes = candidateTypes.filter(
                    (t) => t.category && t.category._id === categoryDoc._id
                );
            }
            const typeDoc =
                candidateTypes.find(
                    (t) =>
                        (t.slug && t.slug.toLowerCase() === desiredTypeSlug) ||
                        t.title.toLowerCase().includes(desiredTypeSlug)
                ) || null;
            if (typeDoc) typeRef = typeDoc._id;
        }
    } catch {
        // If taxonomy lookup fails, leave category/type undefined and continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc: any = {
        _type: "vehicle",
        _id: baseId,
        title: titleForDoc,
        slug: { _type: "slug", current: slugCurrent },
        model: detail.model,
        year: detail.year,
        registrationYear: detail.registrationYear,
        mileage: detail.mileage,
        fuelType: detail.fuelType,
        engineDisplacement: detail.engineDisplacement,
        transmission: detail.transmission,
        bodyType: detail.bodyType,
        seats: detail.seats,
        doors: detail.doors,
        drivetrain: detail.drivetrain,
        brand: brandRefId ? { _type: "reference", _ref: brandRefId } : undefined,
        category: categoryRef
            ? { _type: "reference", _ref: categoryRef }
            : undefined,
        type: typeRef
            ? { _type: "reference", _ref: typeRef }
            : undefined,
        batteryCapacityKwh: detail.batteryCapacityKwh,
        rangeKm: detail.rangeKm,
        price: detail.price,
        sku: detail.sku,
        isOnSale: true,
        isNewEnergy: detail.fuelType
            ? ["BEV", "PHEV", "EV", "Electric", "Hybrid"].some((t) =>
                detail.fuelType!.toLowerCase().includes(t.toLowerCase())
            )
            : false,
        features: detail.features.length > 0 ? detail.features : undefined,
        scrapedAt: todayUtc,
        images: images.length > 0 ? images : undefined,
    };

    try {
        await sanity.createOrReplace(doc);
        console.log(`  ✅  Upserted: ${titleForDoc} (${detail.sku || "no-sku"})`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌  Failed "${titleForDoc}": ${msg}`);
    }
}

// ─── Brand scraping (https://www.autocango.com/ucbrand) ─────────────────────────

async function scrapeBrandsPage(page: Page): Promise<BrandScraped[]> {
    console.log(`\n🚘  Scraping brands from: ${BRANDS_URL}`);
    try {
        await page.goto(BRANDS_URL, {
            waitUntil: "domcontentloaded",
            timeout: PAGE_TIMEOUT,
        });
        await sleep(2000);

        // Click "Expand More" button (if present) to load additional brands.
        // The button has selector `.arrow-btn` in the app container.
        for (let i = 0; i < 10; i++) {
            const hasExpand = await page.$("div.app-container .arrow-btn");
            if (!hasExpand) break;
            const isVisible = await page.evaluate((sel) => {
                const el = document.querySelector<HTMLElement>(sel);
                if (!el) return false;
                const style = window.getComputedStyle(el);
                return (
                    style.display !== "none" &&
                    style.visibility !== "hidden" &&
                    !!el.offsetParent
                );
            }, "div.app-container .arrow-btn");
            if (!isVisible) break;

            console.log("  → Clicking \"Expand More\" to load more brands...");
            await page.click("div.app-container .arrow-btn");
            await sleep(1500);
        }
    } catch {
        console.warn("  ⚠  Failed to load brands page.");
        return [];
    }

    const brands = (await page.evaluate(`
      (function () {
        var byName = new Map();

        function normalizeName(name) {
          return name.trim().replace(/\\s+/g, " ");
        }

        function addBrand(nameRaw, countRaw, logoUrl) {
          var name = normalizeName(nameRaw || "");
          if (!name) return;
          var count = 0;
          if (typeof countRaw === "string" && countRaw) {
            var parsed = parseInt(countRaw.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(parsed)) count = parsed;
          }

          var existing = byName.get(name);
          if (existing) {
            var maxCount = Math.max(existing.count, count);
            var chosenLogo = existing.logoUrl || logoUrl || null;
            byName.set(name, { name: name, count: maxCount, logoUrl: chosenLogo });
          } else {
            byName.set(name, { name: name, count: count, logoUrl: logoUrl || null });
          }
        }

        function makeAbsolute(src) {
          if (!src) return null;
          if (src.indexOf("http") === 0) return src;
          try {
            return new URL(src, "https://www.autocango.com").href;
          } catch (e) {
            return null;
          }
        }

        // Updated strategy for current DOM:
        // - Brand lists live in ul.grid-list under div.app-container
        // - Each li contains an <a> with <p class="name">Brand</p> and a logo <img.el-image__inner>
        var brandLinks = Array.prototype.slice.call(
          document.querySelectorAll('div.app-container ul.grid-list li a')
        );

        for (var i = 0; i < brandLinks.length; i++) {
          var link = brandLinks[i];
          var nameFromP = link.querySelector("p.name");
          var brandName = nameFromP && nameFromP.textContent
            ? nameFromP.textContent.trim()
            : "";

          var text = (link.textContent || "").trim();
          var match = text.match(/^(.+?)\\s*\\((\\d+)\\)$/);
          var nameFromText = null;
          var count = undefined;
          if (match) {
            nameFromText = match[1];
            count = match[2];
          }

          var finalName = brandName || nameFromText || text;
          if (!finalName) continue;

          var img = link.querySelector("div.el-image img.el-image__inner") ||
                    link.querySelector("img.el-image__inner") ||
                    link.querySelector("img");
          var logoUrl = makeAbsolute(
            (img && (img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original"))) || null
          );

          addBrand(finalName, count, logoUrl);
        }

        // Fallback: if for some reason no brand links were captured, fall back to text lists
        if (byName.size === 0) {
          var containers = document.querySelectorAll(".popular, .grid-list");
          var regex = /([A-Za-z0-9&.' +\\-]+?)\\s*\\((\\d+)\\)/g;
          containers.forEach(function (container) {
            var text = container.textContent || "";
            var m;
            while ((m = regex.exec(text)) !== null) {
              addBrand(m[1], m[2], null);
            }
          });
        }

        return Array.from(byName.values());
      })()
    `)) as BrandScraped[];

    console.log(`  → Found ${brands.length} unique brands on brands page.`);
    return brands;
}

async function downloadImageBuffer(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode && res.statusCode >= 400) {
                    reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                    return;
                }
                const chunks: Buffer[] = [];
                res.on("data", (chunk) => {
                    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                });
                res.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
            })
            .on("error", (err) => {
                reject(err);
            });
    });
}

async function uploadImageFromUrl(url: string, filename: string) {
    try {
        const buffer = await downloadImageBuffer(url);
        const asset = await sanity.assets.upload("image", buffer, {
            filename,
        });
        return {
            _type: "image",
            asset: {
                _type: "reference",
                _ref: asset._id,
            },
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠  Failed to upload image ${url}: ${msg}`);
        return undefined;
    }
}

async function uploadBrandLogoFromUrl(url: string, slug: string) {
    try {
        const buffer = await downloadImageBuffer(url);
        const asset = await sanity.assets.upload("image", buffer, {
            filename: `${slug || "brand"}.jpg`,
        });
        return {
            _type: "image",
            asset: {
                _type: "reference",
                _ref: asset._id,
            },
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`  ⚠  Failed to upload logo for ${slug}: ${msg}`);
        return undefined;
    }
}

async function syncBrands(brands: BrandScraped[]): Promise<void> {
    if (brands.length === 0) {
        console.log("No brands to sync.");
        return;
    }

    console.log("\n🧹  Removing existing Sanity brand documents...");
    const existing = await sanity.fetch<{ _id: string; title: string }[]>(
        '*[_type == "brand"]{ _id, title }'
    );
    if (existing.length > 0) {
        const deleteTx = sanity.transaction();
        for (const doc of existing) {
            deleteTx.delete(doc._id);
        }
        await deleteTx.commit();
        console.log(`  → Deleted ${existing.length} existing brand documents.`);
    } else {
        console.log("  → No existing brand documents found.");
    }

    console.log("\n🆕  Creating brand documents from AutoCango...");

    // Hot brands list exactly matching AutoCango Popular section
    const HOT_BRAND_NAMES = new Set([
        "BYD",
        "Toyota",
        "HongQi",
        "ChangAn",
        "Nissan",
        "Mercedes-Benz",
        "Chery",
        "MG",
        "Geely",
        "Haval",
        "GAC",
        "Jetour",
        "Tesla",
        "NIO",
        "Xpeng",
        "Zeekr",
        "Volkswagen",
        "BMW",
    ]);

    // Sort so that hot brands come first, then by descending count, then name
    const sorted = [...brands].sort((a, b) => {
        const aHot = HOT_BRAND_NAMES.has(a.name);
        const bHot = HOT_BRAND_NAMES.has(b.name);
        if (aHot !== bHot) return aHot ? -1 : 1;
        if (b.count !== a.count) return b.count - a.count;
        return a.name.localeCompare(b.name);
    });

    const tx = sanity.transaction();

    for (let index = 0; index < sorted.length; index++) {
        const b = sorted[index];
        const slugCurrent = slugify(b.name);

        const doc: any = {
            _type: "brand",
            _id: `brand-${slugCurrent}`,
            title: b.name,
            slug: { _type: "slug", current: slugCurrent },
            isHot: HOT_BRAND_NAMES.has(b.name),
            order: index,
        };

        if (b.logoUrl) {
            const logo = await uploadBrandLogoFromUrl(b.logoUrl, slugCurrent);
            if (logo) {
                doc.logo = logo;
                doc.thumbnail = logo;
            }
        }

        tx.createOrReplace(doc);
    }

    await tx.commit();
    console.log(`  ✅  Synced ${brands.length} brands into Sanity.`);
}

async function runBrandSync(browser: Browser) {
    const page = await browser.newPage();
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 900 });

    const brands = await scrapeBrandsPage(page);

    const outPath = path.resolve(process.cwd(), "scripts", "output-autocango-brands.json");
    fs.writeFileSync(outPath, JSON.stringify(brands, null, 2), "utf8");
    console.log(`\n💾  Brand data saved to ${outPath}`);

    await syncBrands(brands);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function runUsedCarScraper(
    browser: Browser,
    brandNameFilter?: string,
    pagesOverride?: PageRangeOverride,
) {
    const allDetails: CarDetail[] = [];
    const seenUrls = new Set<string>();

    const listPage = await browser.newPage();
    await listPage.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await listPage.setViewport({ width: 1280, height: 900 });

    // Collect brand-specific listing URLs
    let brandListingUrls: string[] = [];

    if (brandNameFilter && brandNameFilter.trim() !== "") {
        // Single brand mode: only scrape this brand
        const encoded = encodeURIComponent(brandNameFilter.trim());
        const singleUrl = `${BASE_URL}/usedcar/brandName=${encoded}`;
        console.log(`\n📑  Using single brand filter: ${brandNameFilter} → ${singleUrl}`);
        brandListingUrls = [singleUrl];
    } else {
        // Default: discover all brand listing URLs via /ucbrand
        console.log("\n📑  Discovering brand listing pages from /ucbrand...");
        try {
            await listPage.goto(BRANDS_URL, {
                waitUntil: "domcontentloaded",
                timeout: PAGE_TIMEOUT,
            });
            await sleep(1500);
        } catch {
            console.warn("  ⚠  Failed to load brands page for used car scraping.");
        }

        brandListingUrls = await listPage.evaluate((baseUrl: string) => {
            const links = Array.from(
                document.querySelectorAll<HTMLAnchorElement>('a[href^="/usedcar/brandName="]'),
            );
            const urls = links
                .map((a) => a.getAttribute("href") || "")
                .filter((href) => !!href)
                .map((href) => {
                    try {
                        return new URL(href, baseUrl).href;
                    } catch {
                        return "";
                    }
                })
                .filter((href) => !!href);
            return Array.from(new Set(urls));
        }, BASE_URL);

        console.log(`  → Found ${brandListingUrls.length} brand listing URLs.`);
    }

    // Helper to scrape one listing page URL
    async function scrapeListingPageForUrl(
        page: Page,
        url: string,
    ): Promise<{ listings: CarListing[]; nextUrl: string | null }> {
        console.log(`  → Listing page: ${url}`);
        try {
            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: PAGE_TIMEOUT,
            });
            await sleep(1500);
        } catch {
            console.warn(`  ⚠  Timeout loading listing page ${url}. Skipping.`);
            return { listings: [], nextUrl: null };
        }

        return page.evaluate(`
          (function () {
            function toAbs(href) {
              if (!href) return null;
              try {
                return new URL(href, "https://www.autocango.com").href;
              } catch (e) {
                return null;
              }
            }

            // Any link to a specific used car detail page
            var anchors = Array.prototype.slice.call(
              document.querySelectorAll('a[href^="/sku/usedcar-"]')
            );

            var listings = anchors
              .map(function (anchor) {
                var href = anchor.getAttribute("href") || "";
                var detailUrl = toAbs(href) || "";
                var title =
                  anchor.getAttribute("title") ||
                  (anchor.textContent || "").trim() ||
                  "";
                var imgEl = anchor.querySelector("img");
                var imageUrl =
                  (imgEl &&
                    (imgEl.getAttribute("src") ||
                      imgEl.getAttribute("data-src"))) ||
                  null;
                return { detailUrl: detailUrl, title: title, imageUrl: imageUrl };
              })
              .filter(function (l) {
                return l.detailUrl.indexOf("/sku/usedcar-") !== -1;
              });

            // Find "next" page link in pagination
            var nextAnchor =
              document.querySelector(
                'a[rel="next"], .pagination a.next, .pager-next a, a.page-next'
              ) || null;
            var nextUrl = nextAnchor ? toAbs(nextAnchor.getAttribute("href")) : null;

            return { listings: listings, nextUrl: nextUrl };
          })()
        `) as Promise<{ listings: CarListing[]; nextUrl: string | null }>;
    }

    // Determine the maximum page number for a brand by inspecting the pagination
    async function getMaxPageForBrand(page: Page, url: string): Promise<number> {
        try {
            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: PAGE_TIMEOUT,
            });
            await sleep(1500);
        } catch {
            console.warn(`  ⚠  Failed to load brand page for pagination detection: ${url}`);
            return 1;
        }

        const maxPage = await page.evaluate(`
          (function () {
            var container = document.querySelector(".el-pagination.is-background");
            if (!container) return 1;

            var nums = [];
            container.querySelectorAll("button, li, span").forEach(function (el) {
              var text = (el.textContent || "").trim();
              if (!text) return;
              if (!/^\\d+$/.test(text)) return;
              var n = parseInt(text, 10);
              if (!isNaN(n)) nums.push(n);
            });

            if (nums.length === 0) return 1;
            return nums.reduce(function (max, n) { return n > max ? n : max; }, nums[0]);
          })()
        `) as number;

        return maxPage > 0 ? maxPage : 1;
    }

    const allListingUrls: CarListing[] = [];
    for (const brandUrl of brandListingUrls) {
        console.log(`\n📄  Scraping listings for brand URL: ${brandUrl}`);

        const maxPageFromSite = await getMaxPageForBrand(listPage, brandUrl);

        let high = maxPageFromSite;
        let low = 1;

        if (pagesOverride) {
            const rawStart = pagesOverride.start ?? maxPageFromSite;
            const rawEnd = pagesOverride.end ?? rawStart;

            const minReq = Math.min(rawStart, rawEnd);
            const maxReq = Math.max(rawStart, rawEnd);

            low = Math.max(1, minReq);
            high = Math.min(maxPageFromSite, maxReq);
        }

        if (high < 1) high = 1;
        if (low < 1) low = 1;
        if (low > high) {
            console.log(
                `  → Requested page range [${low}, ${high}] is empty after clamping. Skipping brand.`,
            );
            continue;
        }

        const totalInRange = high - low + 1;
        const pagesToVisit = Math.min(totalInRange, MAX_PAGES_PER_BRAND);

        console.log(
            `  → Detected up to ${maxPageFromSite} pages for this brand (visiting ${pagesToVisit} page(s) in range ${low}-${high}, newest pages first).`,
        );

        let visited = 0;
        for (let pageIndex = high; pageIndex >= low && visited < pagesToVisit; pageIndex--) {
            const pageUrl =
                pageIndex === 1
                    ? brandUrl
                    : `${brandUrl}${brandUrl.includes("?") ? "&" : "?"}page=${pageIndex}`;

            const { listings } = await scrapeListingPageForUrl(listPage, pageUrl);
            console.log(
                `  Found ${listings.length} listings on brand page ${pageIndex} for ${brandUrl}`,
            );

            for (const l of listings) {
                if (!seenUrls.has(l.detailUrl)) {
                    seenUrls.add(l.detailUrl);
                    allListingUrls.push(l);
                }
            }

            visited += 1;
            await sleep(DELAY_MS);
        }
    }

    console.log(`\n📋  Total unique listings found: ${allListingUrls.length}`);

    // Now scrape each detail page
    const detailPage = await browser.newPage();
    await detailPage.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await detailPage.setViewport({ width: 1280, height: 900 });

    for (let i = 0; i < allListingUrls.length; i++) {
        const { detailUrl, title, imageUrl } = allListingUrls[i];
        console.log(`\n[${i + 1}/${allListingUrls.length}] ${title || detailUrl}`);

        await sleep(DELAY_MS);
        const detail = await scrapeDetailPage(detailPage, detailUrl);
        if (!detail) continue;

        // Fallback image from card if detail page didn't have one
        if (!detail.imageUrl && imageUrl) detail.imageUrl = imageUrl;

        allDetails.push(detail);
        await upsertVehicle(detail);
    }

    const outPath = path.resolve(process.cwd(), "scripts", "output-autocango.json");
    fs.writeFileSync(outPath, JSON.stringify(allDetails, null, 2), "utf8");
    console.log(`\n💾  Raw data saved to ${outPath}`);
    console.log(`\n✅  Done! ${allDetails.length} vehicles processed.`);
}

async function main() {
    const isBrandMode = process.argv.includes("--brands");
    const brandNameArg =
        process.argv
            .find((arg) => arg.startsWith("--brandName="))
            ?.split("=")[1] ?? undefined;

    // Optional page range override: --pages=80-100 or --pages=100
    let pagesOverride: PageRangeOverride;
    const pagesArg =
        process.argv.find((arg) => arg.startsWith("--pages="))?.split("=")[1] ??
        undefined;
    if (pagesArg) {
        const m = pagesArg.match(/^(\d+)(?:-(\d+))?$/);
        if (m) {
            const start = Number.parseInt(m[1], 10);
            const end = m[2] ? Number.parseInt(m[2], 10) : undefined;
            if (!Number.isNaN(start) && start > 0) {
                pagesOverride = { start, end };
            }
        }
    }

    if (isBrandMode) {
        console.log("🏷️  AutoCango Brand Scraper");
    } else {
        console.log("🚗  AutoCango Used Car Scraper");
    }
    console.log("─".repeat(50));
    console.log(
        "ℹ  Note: AutoCango /parts is inquiry-only. Only used car listings are scraped.\n"
    );

    const browser: Browser = await puppeteer.launch({
        headless: isBrandMode ? false : true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
        ],
        defaultViewport: { width: 1280, height: 900 },
    });

    try {
        if (isBrandMode) {
            await runBrandSync(browser);
        } else {
            await runUsedCarScraper(browser, brandNameArg, pagesOverride);
        }
    } finally {
        try {
            await browser.close();
        } catch (err) {
            // On Windows, Chromium profile cleanup can intermittently fail with EBUSY file locks.
            // This is a non-fatal cleanup issue; the scrape output and Sanity writes have already happened.
            console.warn("⚠  Browser cleanup error (ignored):", err);
        }
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
