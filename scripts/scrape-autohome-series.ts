/**
 * Scrapes Autohome imglist pages, translates names to English only,
 * uploads thumbnail + other images to Sanity (vehicleSeries).
 *
 * Env: expects .env.local in project root (same folder as package.json).
 * Uses NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN, OPENAI_API_KEY.
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

/** Find project root by walking up from script location until package.json exists. */
function findProjectRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// Load from cwd first (npm run sets cwd to project root), then from script-resolved project root
const cwd = process.cwd();
for (const root of [cwd, findProjectRoot()]) {
  const envLocal = resolve(root, ".env.local");
  const envFile = resolve(root, ".env");
  if (existsSync(envLocal)) {
    config({ path: envLocal, override: true });
    if (process.env.DEBUG) console.log("Loaded .env.local from", envLocal);
  }
  if (existsSync(envFile)) {
    config({ path: envFile, override: true });
  }
}

// Fallback: if key vars still missing, parse .env.local from cwd or project root
function loadEnvLocalFallback(): void {
  const need =
    !process.env.NEXT_PUBLIC_SANITY_API_TOKEN &&
    !process.env.SANITY_API_TOKEN &&
    !process.env.OPENAI_API_KEY;
  if (!need) return;
  const projectRoot = findProjectRoot();
  for (const root of [cwd, projectRoot]) {
    const envPath = resolve(root, ".env.local");
    if (!existsSync(envPath)) continue;
    let raw = readFileSync(envPath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // strip BOM
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      let key = trimmed.slice(0, eq).trim();
      if (key.charCodeAt(0) === 0xfeff) key = key.slice(1);
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = value; // override even if already set (e.g. empty)
    }
    return;
  }
}
loadEnvLocalFallback();

import { createClient } from "@sanity/client";
import OpenAI from "openai";
import puppeteer from "puppeteer";
import slugify from "slugify";
import crypto from "crypto";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "fhp2b1rf";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const token =
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN || process.env.SANITY_API_TOKEN;
const dryRun =
  process.env.SCRAPE_DRY_RUN === "1" ||
  process.env.SCRAPE_DRY_RUN === "true" ||
  !token;

if (!token) {
  console.warn(
    "No Sanity write token found. Running in dry-run (no writes). Set NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN in .env.local (exact name, no spaces) to write to Sanity.",
  );
}

const client = token
  ? createClient({
      projectId,
      dataset,
      token,
      apiVersion: "2024-01-01",
      useCdn: false,
    })
  : null;

const openaiKey = process.env.OPENAI_API_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

type ScrapedItem = {
  nameZh: string;
  priceText: string;
  seriesUrl: string;
  thumbnailUrl: string | null;
  autohomeId: string;
};

/** Translate Chinese car name to concise English (OpenAI). */
async function translateToEnglish(text: string): Promise<string> {
  const src = text.trim();
  if (!src) return "";
  if (!openai) {
    console.warn("OPENAI_API_KEY missing, returning original text");
    return src;
  }
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You translate Chinese car series/model names to concise, natural English. " +
            "Use official brand names (e.g. BMW 3 Series, Audi A6L). Output ONLY the English name, no punctuation or explanation.",
        },
        { role: "user", content: src },
      ],
      max_tokens: 30,
      temperature: 0.2,
    });
    const out = res.choices[0]?.message?.content?.trim();
    return out || src;
  } catch (e) {
    console.warn("OpenAI translate failed for", src, e);
    return src;
  }
}

/** Short English tagline for marketing (OpenAI). */
async function generateTagline(nameEn: string, priceRaw: string): Promise<string> {
  if (!openai) return "";
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write a short, punchy one-line tagline for a car listing (max 12 words). No quotes.",
        },
        { role: "user", content: `Model: ${nameEn}\nPrice: ${priceRaw}` },
      ],
      max_tokens: 40,
      temperature: 0.7,
    });
    return res.choices[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    console.warn("OpenAI tagline failed for", nameEn, e);
    return "";
  }
}

function parsePriceRange(raw: string): {
  min?: number;
  max?: number;
  raw?: string;
} {
  const t = raw.trim();
  if (!t || t.includes("暂无") || t.includes("报价")) {
    return { raw: t || "暂无报价" };
  }
  // e.g. "9.99-12.69万" or "33.90万"
  const match = t.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (match) {
    const min = Number.parseFloat(match[1]);
    const max = Number.parseFloat(match[2]);
    if (!Number.isNaN(min) && !Number.isNaN(max))
      return { min, max, raw: t };
  }
  const single = t.match(/([\d.]+)/);
  if (single) {
    const v = Number.parseFloat(single[1]);
    if (!Number.isNaN(v)) return { min: v, max: v, raw: t };
  }
  return { raw: t };
}

function makeSeriesId(autohomeId: string): string {
  return `vehicleSeries.${autohomeId}`;
}

function makeSlug(title: string): string {
  const s = slugify(title, { lower: true, strict: true });
  return s || "series";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Download image and upload to Sanity; returns asset ref for image field. Skips upload in dry run. */
async function uploadImageToSanity(
  imageUrl: string,
  filename?: string,
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  if (!client) return null;
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const name =
      filename ||
      imageUrl.split("/").pop()?.split("?")[0] ||
      `image-${Date.now()}.jpg`;
    const asset = await client.assets.upload("image", buffer, { filename: name });
    const ref = (asset as { _id: string })._id;
    return {
      _type: "image",
      asset: { _type: "reference", _ref: ref },
    };
  } catch (e) {
    console.warn("Upload failed for", imageUrl, e);
    return null;
  }
}

/** Scrape one imglist page: series name (zh), price, thumbnail, series URL. */
async function scrapeListPage(
  pageUrl: string,
): Promise<ScrapedItem[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 60_000 });

  const items = await page.evaluate(() => {
    const result: Array<{
      nameZh: string;
      priceText: string;
      seriesUrl: string;
      thumbnailUrl: string | null;
      autohomeId: string;
    }> = [];
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("a"));
    for (const a of links) {
      if (!a.textContent?.includes("查看车系")) continue;
      const href = a.href || "";
      const idMatch = href.match(/autohome\.com\.cn\/(\d+)/);
      const autohomeId = idMatch ? idMatch[1] : "";

      let container: Element | null = a.closest("div");
      if (!container) container = a.parentElement;
      for (let up = 0; up < 5 && container; up++) {
        const prev = container.previousElementSibling;
        const h2 = container.querySelector("h2") || container.querySelector("h3");
        const nameEl = h2 || prev?.querySelector("h2, h3") || prev;
        const nameZh = nameEl?.textContent?.trim() || "";

        const priceEl =
          container.querySelector(".price") ||
          container.nextElementSibling ||
          Array.from(container.querySelectorAll("*")).find((el) =>
            /[\d.]+[-–][\d.]+万|暂无报价/.test(el.textContent || ""),
          );
        const priceText = priceEl?.textContent?.trim() || "";

        const img =
          container.querySelector<HTMLImageElement>("img") ||
          container.parentElement?.querySelector<HTMLImageElement>("img");
        const thumbnailUrl = img?.src || null;

        if (nameZh && href) {
          result.push({
            nameZh,
            priceText,
            seriesUrl: href,
            thumbnailUrl,
            autohomeId: autohomeId || "",
          });
          break;
        }
        container = container.parentElement;
      }
    }
    return result;
  });

  await browser.close();
  return items.map((item) => ({
    ...item,
    autohomeId:
      item.autohomeId ||
      crypto.createHash("sha1").update(item.seriesUrl).digest("hex").slice(0, 8),
  }));
}

/** Fetch extra image URLs from series page (e.g. first gallery images). */
async function fetchMoreImageUrls(
  seriesUrl: string,
  limit: number,
): Promise<string[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  const urls: string[] = [];
  try {
    // domcontentloaded is faster and avoids timeouts; Autohome often never reaches networkidle2
    await page.goto(seriesUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await delay(800);
    const imgUrls = await page.evaluate((max: number) => {
      const imgs = document.querySelectorAll<HTMLImageElement>(
        "img[src*='autohome'], img[src*='sinaimg'], img[data-src]",
      );
      const out: string[] = [];
      for (const img of imgs) {
        const src = img.dataset.src || img.src;
        if (src && /\.(jpg|jpeg|png|webp)/i.test(src) && out.length < max) {
          out.push(src);
        }
      }
      return out.slice(0, max);
    }, limit);
    urls.push(...imgUrls);
  } finally {
    await browser.close();
  }
  return urls;
}

/** Parse CLI: no args = 1..346, one arg = 1..n, two args = start..end */
function parsePageRange(): { start: number; end: number } {
  const args = process.argv.slice(2).map((a) => parseInt(a, 10)).filter((n) => !Number.isNaN(n));
  if (args.length === 0) return { start: 1, end: 346 };
  if (args.length === 1) return { start: 1, end: Math.max(1, args[0]) };
  const start = Math.max(1, args[0]);
  const end = Math.max(start, args[1]);
  return { start, end };
}

async function main() {
  if (dryRun) console.log("DRY RUN: no Sanity writes or image uploads.");
  const { start, end } = parsePageRange();
  console.log("Scraping pages", start, "to", end);

  for (let pageNum = start; pageNum <= end; pageNum++) {
    const url = `https://www.autohome.com.cn/cars/imglist-index/x_x/x-x-x-x-${pageNum}`;
    console.log("Page", pageNum, url);

    const scraped = await scrapeListPage(url);
    console.log("Scraped", scraped.length, "items");

    for (const item of scraped) {
      const title = await translateToEnglish(item.nameZh);
      if (!title) continue;

      const tagline = await generateTagline(title, item.priceText);
      const slug = makeSlug(title);
      const _id = makeSeriesId(item.autohomeId);
      const priceRange = parsePriceRange(item.priceText);

      const thumbnail =
        item.thumbnailUrl
          ? await uploadImageToSanity(item.thumbnailUrl, `thumb-${item.autohomeId}.jpg`)
          : null;

      let imageUrls: string[] = [];
      if (!dryRun) {
        try {
          imageUrls = await fetchMoreImageUrls(item.seriesUrl, 8);
          const thumb = item.thumbnailUrl;
          imageUrls = imageUrls.filter((u) => u !== thumb);
        } catch (e) {
          const msg = e instanceof Error && e.name === "TimeoutError" ? "timeout" : (e instanceof Error ? e.message : String(e));
          console.warn("Extra images fetch failed for", item.seriesUrl, "—", msg);
        }
      }

      const imageRefs: Array<{ _type: "image"; asset: { _type: "reference"; _ref: string } }> = [];
      for (const u of imageUrls.slice(0, 10)) {
        const ref = await uploadImageToSanity(u);
        if (ref) imageRefs.push(ref);
      }

      const doc = {
        _id,
        _type: "vehicleSeries" as const,
        title,
        slug: { _type: "slug" as const, current: slug },
        ...(tagline && { tagline }),
        ...(thumbnail && { thumbnail }),
        ...(imageRefs.length > 0 && { images: imageRefs }),
        priceRange,
        autohomeUrl: item.seriesUrl,
        autohomeId: item.autohomeId,
        isOnSale: true,
        isNewEnergy: false,
      };

      if (client) {
        await client.createOrReplace(doc);
        console.log("Upserted:", title, _id);
      } else {
        console.log("[DRY RUN] Would upsert:", title, _id, doc.priceRange);
      }
    }

    if (pageNum < end) await delay(1500);
  }

  console.log(dryRun ? "Done (dry run, no data written)." : "Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
