/**
 * Scrapes Autohome car page for brand names, translates to English,
 * and creates/updates Brand documents in Sanity.
 *
 * Env: .env.local with NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_PROJECT_ID,
 * NEXT_PUBLIC_SANITY_DATASET, SANITY_DATASET, NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN,
 * OPENAI_API_KEY (optional, for translation).
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

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

const cwd = process.cwd();
for (const root of [cwd, findProjectRoot()]) {
  const envLocal = resolve(root, ".env.local");
  const envFile = resolve(root, ".env");
  if (existsSync(envLocal)) {
    config({ path: envLocal, override: false });
  }
  if (existsSync(envFile)) {
    config({ path: envFile, override: false });
  }
}

function loadEnvLocalFallback(): void {
  const need =
    !process.env.NEXT_PUBLIC_SANITY_API_TOKEN &&
    !process.env.SANITY_API_TOKEN;
  if (!need) return;
  const projectRoot = findProjectRoot();
  for (const root of [cwd, projectRoot]) {
    const envPath = resolve(root, ".env.local");
    if (!existsSync(envPath)) continue;
    let raw = readFileSync(envPath, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      let key = trimmed.slice(0, eq).trim();
      if (key.charCodeAt(0) === 0xfeff) key = key.slice(1);
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = value;
    }
    return;
  }
}
loadEnvLocalFallback();

import { createClient } from "@sanity/client";
import OpenAI from "openai";
import puppeteer from "puppeteer";
import slugify from "slugify";

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
    "No Sanity write token. Running in dry-run. Set NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN in .env.local to write.",
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

/** Static Chinese → English for common brands when OpenAI is unavailable. */
const CHINESE_BRAND_MAP: Record<string, string> = {
  "东风": "Dongfeng",
  "东风风神": "Dongfeng Fengshen",
  "东风风光": "Dongfeng Fengguang",
  "东风风行": "Dongfeng Forthing",
  "东风风度": "Dongfeng Rich",
  "东风小康": "Dongfeng Xiaokang",
  "东风富康": "Dongfeng Fukang",
  "东风御风": "Dongfeng Yufeng",
  "东风氢舟": "Dongfeng Hydrogen",
  "东风奕派": "Dongfeng eπ",
  "五菱汽车": "Wuling",
  "腾势": "Denza",
  "长安": "Changan",
  "长安欧尚": "Changan Oshan",
  "长安凯程": "Changan Kaicheng",
  "长安跨越": "Changan Kuayue",
  "长安启源": "Changan Qiyuan",
  "深蓝汽车": "Deepal",
  "荣威": "Roewe",
  "吉利汽车": "Geely",
  "吉利几何": "Geely Geometry",
  "吉利雷达": "Geely Radar",
  "吉利银河": "Geely Galaxy",
  "奇瑞": "Chery",
  "奇瑞汽车": "Chery",
  "奇瑞新能源": "Chery New Energy",
  "奇瑞风云": "Chery Fengyun",
  "北汽新能源": "BAIC BJEV",
  "领克": "Lynk & Co",
  "魏牌": "Wey",
  "蔚来": "NIO",
  "威马汽车": "WM Motor",
  "哪吒汽车": "Neta",
  "零跑汽车": "Leapmotor",
  "欧拉": "ORA",
  "理想汽车": "Li Auto",
  "岚图汽车": "Voyah",
  "极氪": "Zeekr",
  "红旗": "Hongqi",
  "长城": "GWM",
  "AITO 问界": "AITO",
  "岚图": "Voyah",
  "小鹏": "Xpeng",
  "小鹏汽车": "Xpeng",
  "零跑": "Leap Motor",
  "欧朗": "Eolang",
  "荣大智造": "Rongda",
  "埃安": "Aion",
  "智己": "IM Motors",
};

function translateChineseBrandFallback(text: string): string {
  const src = text.trim();
  if (!src) return "";
  const exact = CHINESE_BRAND_MAP[src];
  if (exact) return exact;
  for (const [zh, en] of Object.entries(CHINESE_BRAND_MAP)) {
    if (src.includes(zh)) return en;
  }
  return src;
}

/** Reject OpenAI output that is prose or too long; use fallback instead. */
function sanitizeTranslation(out: string, fallback: string, src: string): string {
  if (!out || out.length > 45) return fallback;
  const lower = out.toLowerCase();
  if (
    lower.includes(" is no ") ||
    lower.includes(" does not ") ||
    lower.includes(" official ") ||
    lower.includes(" widely recognized ") ||
    lower.includes(" as it does not ") ||
    /\.\s/.test(out)
  )
    return fallback;
  return out;
}

async function translateToEnglish(text: string): Promise<string> {
  const src = text.trim();
  if (!src) return "";
  const fallback = translateChineseBrandFallback(src);
  if (fallback !== src) return fallback;
  if (!openai) return fallback;
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You translate Chinese car brand names to official English names (e.g. 宝马 -> BMW, 奥迪 -> Audi). Output ONLY the English name, one short phrase, no punctuation, no explanation.",
        },
        { role: "user", content: src },
      ],
      max_tokens: 30,
      temperature: 0.2,
    });
    const out = res.choices[0]?.message?.content?.trim() ?? "";
    return sanitizeTranslation(out, fallback, src);
  } catch (e) {
    console.warn("OpenAI translate failed for", src, e);
    return fallback;
  }
}

function makeSlug(title: string): string {
  const s = slugify(title, { lower: true, strict: true });
  return s || "brand";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ScrapedBrand = { nameZh: string; nameEn?: string; url?: string; autohomeId?: string; logoUrl?: string | null };

/** Normalize protocol-relative URL for fetch. */
function normalizeLogoUrl(url: string): string {
  const u = url.trim();
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

/** Upload image URL to Sanity; returns asset ref for logo field. Use .png when URL is PNG. */
async function uploadImageToSanity(
  imageUrl: string,
  filename?: string,
): Promise<{ _type: "image"; asset: { _type: "reference"; _ref: string } } | null> {
  if (!client) return null;
  const url = normalizeLogoUrl(imageUrl);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = /\.png(\?|$)/i.test(url) ? ".png" : ".jpg";
    const name = filename || url.split("/").pop()?.split("?")[0] || `logo-${Date.now()}${ext}`;
    const finalName = name.toLowerCase().endsWith(".png") ? name : (name.replace(/\.[^.]+$/i, "") || name) + ext;
    const asset = await client.assets.upload("image", buffer, { filename: finalName });
    const ref = (asset as { _id: string })._id;
    return { _type: "image", asset: { _type: "reference", _ref: ref } };
  } catch (e) {
    console.warn("Upload failed for", url, e);
    return null;
  }
}

/** Fetch logo image URL from a brand page (e.g. car.autohome.com.cn or brand list). */
async function fetchBrandLogoUrl(
  page: import("puppeteer").Page,
  brandPageUrl: string,
): Promise<string | null> {
  try {
    await page.goto(brandPageUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await delay(800);
    const logoUrl = await page.evaluate(() => {
      const sel = "img[src*='logo'], img[src*='brand'], .brand-logo img, .logo img, .carbrand img, [class*='brand'] img[src*='.jpg'], [class*='brand'] img[src*='.png']";
      const img = document.querySelector(sel) as HTMLImageElement | null;
      if (img && img.src && /\.(jpg|jpeg|png|webp)/i.test(img.src)) return img.src;
      const imgs = document.querySelectorAll("img[src*='autohome']");
      for (const i of imgs) {
        const el = i as HTMLImageElement;
        const src = el.src;
        if (src && (el.width > 40 || el.height > 40)) return src;
      }
      return null;
    });
    return logoUrl;
  } catch {
    return null;
  }
}

/** Scrape https://www.autohome.com.cn/car/ for brand links; optionally click A–Z to get all. */
async function scrapeBrandsFromCarPage(): Promise<ScrapedBrand[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  const baseUrl = "https://www.autohome.com.cn/car/";
  const allRawLinks: Array<{ nameZh: string; href: string; autohomeId: string; logoUrl?: string }> = [];

  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await delay(2000);

  const collectLinks = async (): Promise<void> => {
    const chunk = await page.evaluate(() => {
      const out: Array<{ nameZh: string; href: string; autohomeId: string; logoUrl?: string }> = [];
      const links = document.querySelectorAll("a[href*='brand']");
      for (const a of links) {
        const href = (a as HTMLAnchorElement).href || "";
        const m = href.match(/brand[-_]?(\d+)/);
        if (!m) continue;
        const nameZh = (a.textContent || "").trim().replace(/\s+/g, " ");
        let logoUrl: string | undefined;
        const img = a.querySelector("img");
        if (img?.src && !img.src.startsWith("data:") && img.src.includes("autoimg.cn") && (img.src.includes(".png") || img.src.includes("100x100")))
          logoUrl = img.src;
        out.push({ nameZh, href, autohomeId: m[1], ...(logoUrl && { logoUrl }) });
      }
      return out;
    });
    for (const l of chunk) allRawLinks.push(l);
  };

  await collectLinks();

  // Try clicking letter links (A, B, C, ... Z) to load more brands
  const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
  for (const letter of letters) {
    try {
      const clicked = await page.evaluate((L) => {
        const links = document.querySelectorAll("a, button, [role='button']");
        for (const el of links) {
          const text = (el.textContent || "").trim();
          if (text === L && text.length === 1) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, letter);
      if (clicked) {
        await delay(1500);
        await collectLinks();
      }
    } catch {
      // ignore
    }
  }

  // Scrape logos from price strip and A–Z selector list (string to avoid tsx __name serialization in browser)
  const scrapeLogoMapsScript = `
    (function() {
      var byBrandId = {};
      var byNameZh = {};
      function isRealLogo(s) {
        return s && s.indexOf('data:') !== 0 && s.indexOf('autoimg.cn') !== -1 && (s.indexOf('.png') !== -1 || s.indexOf('100x100') !== -1);
      }
      var priceLinks = document.querySelectorAll('a[href*="brandid_"]');
      for (var i = 0; i < priceLinks.length; i++) {
        var a = priceLinks[i];
        var href = a.getAttribute('href') || '';
        var m = href.match(/brandid_(\\d+)/);
        if (!m) continue;
        var img = a.querySelector('img');
        var src = (img && img.src) || (img && img.getAttribute('src')) || '';
        if (isRealLogo(src)) byBrandId[m[1]] = src;
      }
      var selectorNodes = document.querySelectorAll('.auto-cmpt-car-selector-list-node-content');
      for (var j = 0; j < selectorNodes.length; j++) {
        var node = selectorNodes[j];
        var im = node.querySelector('.auto-cmpt-car-selector-list-node-left-img');
        var h3 = node.querySelector('h3');
        var nameZh = (h3 && h3.textContent) ? h3.textContent.trim() : '';
        var sr = (im && im.src) || (im && im.getAttribute('src')) || '';
        if (nameZh && isRealLogo(sr)) byNameZh[nameZh] = sr;
      }
      return { byBrandId: byBrandId, byNameZh: byNameZh };
    })();
  `;
  let logoMaps = (await page.evaluate(scrapeLogoMapsScript)) as {
    byBrandId: Record<string, string>;
    byNameZh: Record<string, string>;
  };

  // Also load price page to get 100x100 PNG logos from the "仅在售" brand strip
  try {
    await page.goto("https://www.autohome.com.cn/price/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await delay(2000);
    const priceLogosScript = `
      (function() {
        var byBrandId = {};
        function isRealLogo(s) {
          return s && s.indexOf('data:') !== 0 && s.indexOf('autoimg.cn') !== -1 && (s.indexOf('.png') !== -1 || s.indexOf('100x100') !== -1);
        }
        var links = document.querySelectorAll('a[href*="brandid_"]');
        for (var i = 0; i < links.length; i++) {
          var a = links[i];
          var m = (a.getAttribute('href') || '').match(/brandid_(\\d+)/);
          if (!m) continue;
          var img = a.querySelector('img');
          var src = (img && img.src) || (img && img.getAttribute('src')) || '';
          if (isRealLogo(src)) byBrandId[m[1]] = src;
        }
        return byBrandId;
      })();
    `;
    const priceLogos = (await page.evaluate(priceLogosScript)) as Record<string, string>;
    logoMaps = { byBrandId: { ...logoMaps.byBrandId, ...priceLogos }, byNameZh: logoMaps.byNameZh };
  } catch {
    // price page optional
  }

  // Exclude filter/category labels in Node
  const excludeSubstrings = [
    "前驱", "后驱", "四驱", "汽油", "柴油", "油电混合", "纯电动", "插电式混动", "增程式", "氢燃料", "轻混",
    "手动", "自动", "中国", "日系", "韩系", "美系", "德国", "捷克", "法国", "英国", "瑞典", "意大利", "国产", "进口",
    "两厢", "三厢", "跨界车", "掀背", "旅行版", "敞篷", "硬顶", "软顶", "客车", "货车", "查看", "更多", "全部", "首页", "报价", "图片", "百科", "视频", "精图", "智能买车",
  ];
  const engineSizeRe = /^[\d.\s\-]+[L升]/;

  const seenKey = new Set<string>();
  const brands = allRawLinks
    .map(({ nameZh, href, autohomeId, logoUrl: linkLogo }) => {
      const trimmed = nameZh.replace(/\s*\(\s*进口\s*\)\s*$/, "").trim();
      const logoUrl =
        linkLogo
          ? normalizeLogoUrl(linkLogo)
          : logoMaps.byBrandId[autohomeId]
            ? normalizeLogoUrl(logoMaps.byBrandId[autohomeId])
            : logoMaps.byNameZh[trimmed]
              ? normalizeLogoUrl(logoMaps.byNameZh[trimmed])
              : undefined;
      return {
        nameZh: trimmed,
        url: href,
        autohomeId,
        ...(logoUrl && { logoUrl }),
      };
    })
    .filter((item) => {
      const t = item.nameZh;
      if (!t || t.length < 2 || t.length > 28) return false;
      if (/^\d+$/.test(t)) return false;
      if (engineSizeRe.test(t)) return false;
      if (/\d+座/.test(t) || /座以上/.test(t)) return false;
      if (excludeSubstrings.some((s) => t.includes(s))) return false;
      const key = `${item.autohomeId}-${t}`;
      if (seenKey.has(key)) return false;
      seenKey.add(key);
      return true;
    });

  await browser.close();
  return brands;
}

/** Fetch logo URLs for each brand by visiting brand pages. */
async function fetchLogosForBrands(
  brands: ScrapedBrand[],
): Promise<ScrapedBrand[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  const result = [...brands];
  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if (!item.url) continue;
    if (item.logoUrl) {
      result[i] = item;
      continue;
    }
    const logoUrl = await fetchBrandLogoUrl(page, item.url);
    result[i] = { ...item, logoUrl: logoUrl || undefined };
    await delay(400);
  }
  await browser.close();
  return result;
}

async function main() {
  if (dryRun) console.log("DRY RUN: no Sanity writes.");
  console.log("Scraping brands from https://www.autohome.com.cn/car/");

  const scraped = await scrapeBrandsFromCarPage();
  console.log("Scraped", scraped.length, "brand candidates");

  // One brand per autohomeId: prefer entry with logoUrl, then shortest Chinese name
  const byId = new Map<string, ScrapedBrand>();
  for (const item of scraped) {
    if (!item.autohomeId) continue;
    const existing = byId.get(item.autohomeId);
    const prefer =
      !existing ||
      (item.logoUrl && !existing.logoUrl) ||
      (!!item.logoUrl === !!existing.logoUrl && item.nameZh.length < existing.nameZh.length);
    if (prefer) byId.set(item.autohomeId, item);
  }
  let uniqueBrands = Array.from(byId.values());

  const skipLogo = process.env.SKIP_LOGO === "1" || process.env.SKIP_LOGO === "true";
  if (!skipLogo && uniqueBrands.length > 0) {
    console.log("Fetching brand logos for", uniqueBrands.length, "brands...");
    uniqueBrands = await fetchLogosForBrands(uniqueBrands);
  }

  const seenTitles = new Set<string>();
  let order = 0;
  for (const item of uniqueBrands) {
    const title = await translateToEnglish(item.nameZh);
    if (!title) continue;
    const norm = title.toLowerCase().trim();
    if (seenTitles.has(norm)) continue;
    seenTitles.add(norm);

    const slug = makeSlug(title);
    const _id = `brand.autohome.${item.autohomeId}`;

    let logoRef: { _type: "image"; asset: { _type: "reference"; _ref: string } } | null = null;
    if (item.logoUrl && client && !dryRun) {
      const ext = /\.png(\?|$)/i.test(item.logoUrl) ? ".png" : ".jpg";
      logoRef = await uploadImageToSanity(item.logoUrl, `brand-${item.autohomeId}-logo${ext}`);
    }

    const doc = {
      _id,
      _type: "brand" as const,
      title,
      slug: { _type: "slug" as const, current: slug },
      order,
      ...(logoRef && { logo: logoRef, thumbnail: logoRef }),
    };

    if (client) {
      await client.createOrReplace(doc);
      console.log("Upserted:", title, _id, logoRef ? "+ logo" : "");
    } else {
      console.log("[DRY RUN] Would upsert:", title, _id);
    }
    order += 1;
    await delay(200);
  }

  console.log(dryRun ? "Done (dry run)." : "Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
