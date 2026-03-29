/**
 * Scrape brand logos from AutoCango and backfill missing `brand.logo` in Sanity
 * for whitelisted brands.
 *
 * Env:
 *  - .env.local / .env with:
 *    - NEXT_PUBLIC_SANITY_PROJECT_ID / SANITY_PROJECT_ID (optional, has default)
 *    - NEXT_PUBLIC_SANITY_DATASET / SANITY_DATASET (optional, has default)
 *    - NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN (write token)
 *  - SCRAPE_DRY_RUN=1 to only log what would be updated.
 *
 * Run:
 *  pnpm exec tsx scripts/scrape-autocango-logos.ts
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";
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

const projectRoot = findProjectRoot();
const cwd = process.cwd();
for (const root of [projectRoot, cwd]) {
  const envLocal = resolve(root, ".env.local");
  const envFile = resolve(root, ".env");
  if (existsSync(envLocal)) config({ path: envLocal, override: true });
  if (existsSync(envFile)) config({ path: envFile, override: true });
}

import { createClient } from "@sanity/client";
import { readFileSync } from "fs";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ||
  process.env.SANITY_PROJECT_ID ||
  "fhp2b1rf";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET ||
  process.env.SANITY_DATASET ||
  "production";
const token =
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN || process.env.SANITY_API_TOKEN;
const dryRun =
  process.env.SCRAPE_DRY_RUN === "1" ||
  process.env.SCRAPE_DRY_RUN === "true" ||
  !token;

if (!token) {
  console.warn(
    "No Sanity write token. Running in dry-run mode (no mutations will be applied).",
  );
}

const client = createClient({
  projectId,
  dataset,
  token: token ?? undefined,
  apiVersion: "2024-01-01",
  useCdn: false,
});

type BrandLogo = {
  name: string;
  logoUrl: string;
};

const ALLOWED_BRANDS = [
  "Audi",
  "Aion",
  "AITO",
  "Avatr",
  "ARCFOX",
  "Alfa Romeo",
  "Aston Martin",
  "Acura",
  "Aiways",
  "AUXUN",
  "ALPINA",
  "AM XIAOAO",
  "AnKai",
  "ARMADILLO",
  "BYD",
  "BMW",
  "Buick",
  "BaoJun",
  "Bestune",
  "BAW",
  "Beijing",
  "BeiJing Auto",
  "Brilliance Auto",
  "BAIC BJEV",
  "Bentley",
  "Borgward",
  "BAIC ChangHe",
  "BAIC Hyosow",
  "BAIC WeiWang",
  "BiSu",
  "Brabus",
  "BAIC RuiXiang",
  "BiKe",
  "BaiZhi",
  "Bufite",
  "ChangAn",
  "Chevrolet",
  "Chery",
  "Cadillac",
  "ChangAn QiYuan",
  "Citroen",
  "ChangAn Oshan",
  "Chery EV",
  "ChangAn Kaicene",
  "ChangAn KuaYue",
  "Chrysler",
  "Ciimo",
  "Cyberspace",
  "CHEVOO",
  "Century",
  "ChengShi",
  "CAVAN",
  "CHTC",
  "Carlsson",
  "Cenntro",
  "Chery Wanda",
  "Denza",
  "Deepal",
  "DongFeng Aeolus",
  "Dongfeng",
  "DongFeng eπ",
  "DongFeng Forthing",
  "DongFeng Fengon",
  "DongFeng FuKang",
  "DongFeng DFAC",
  "DS",
  "DongFeng DFSK",
  "Dodge",
  "DaYun",
  "DongFeng FengDu",
  "Dorcen",
  "Dearcc",
  "Exceed",
  "Everus",
  "Enovate",
  "Enranger",
  "EV House",
  "Ford",
  "FangChengBao",
  "Foton",
  "Fulwin",
  "Ferrari",
  "Firefly",
  "FAW",
  "Fiat",
  "Foday",
  "FHA",
  "FeiDi",
  "Geely",
  "GAC Trumpchi",
  "Geely Galaxy",
  "Geometry",
  "Great Wall",
  "GAC",
  "Golden Dragon",
  "GMC",
  "Genesis",
  "GuoJi",
  "Gleagle",
  "George Patton",
  "GAC Gonow",
  "Honda",
  "Haval",
  "Hyundai",
  "HongQi",
  "HaiMa",
  "HYPTEC",
  "HanTeng",
  "HIMA",
  "Hycan",
  "HiPhi",
  "HuangHai",
  "HawTai",
  "Hunkt",
  "Hummer",
  "HuaSong",
  "HEDMOS",
  "Hafei Motor",
  "HuaTai",
  "HuaChenXinRi",
  "Higer",
  "HuaKai",
  "HengChi",
  "Horki",
  "HuaZi Auto",
  "IM",
  "Isuzu",
  "Infiniti",
  "Iveco",
  "iCAR",
  "Jetour",
  "Jetta",
  "Jeep",
  "Jaguar",
  "Jetour ShanHai",
  "JAC",
  "JMC",
  "JinBei",
  "JAC Refine",
  "JMEV",
  "JiYue",
  "Jetour Zongheng",
  "Jenhoo",
  "JDMC",
  "JunTian",
  "Joylong",
  "Jonway",
  "JiangNan",
  "JMMC",
  "Jingfei Automobile",
  "Kia",
  "Karry",
  "KaiYi",
  "KingLong",
  "Kede",
  "Kama",
  "Kawe Auto",
  "KaSheng",
  "Kmuller",
  "Land Rover",
  "Li",
  "LYNK&CO",
  "Lincoln",
  "Lexus",
  "Leapmotor",
  "Lamborghini",
  "Livan",
  "Levdeo",
  "LiFan",
  "Landwind",
  "Luxgen",
  "LingBox",
  "Luxeed",
  "Leopaard",
  "LanDian",
  "Lotus",
  "Lorinser",
  "LUMMA",
  "LinkTour",
  "Linxys",
  "LEVC",
  "Langsi",
  "Lark",
  "LITE",
  "Mercedes-Benz",
  "Mazda",
  "MG",
  "MI",
  "MAXUS",
  "Maserati",
  "Mitsubishi",
  "MINI",
  "McLaren",
  "Mansory",
  "M Hero",
  "MAEXTRO",
  "Morgan",
  "Modern Auto",
  "MaiMai",
  "Nissan",
  "NIO",
  "Neta",
  "NLM Motor",
  "New Gonow",
  "Neomor",
  "Ora",
  "ONVO",
  "Opel",
  "Oley",
  "Obbin",
  "Peugeot",
  "Porsche",
  "Polestar",
  "Pocco",
  "Qoros",
  "QianTu",
  "Roewe",
  "Rolls-Royce",
  "Renault",
  "Ruichi Auto",
  "ROX",
  "ROXROX",
  "Radar",
  "RAM",
  "Riich",
  "Reach",
  "ROXPloeStone",
  "Rely",
  "Rhine Auto",
  "Skoda",
  "Subaru",
  "Suzuki",
  "Smart",
  "Skyworth",
  "Soueast",
  "Sehol",
  "Stelato",
  "SWM",
  "SERES",
  "ShenZhou",
  "Shenzer",
  "SRM",
  "SionGold",
  "ShangJie",
  "SsangYong",
  "Saleen",
  "SONGSAN MOTORS",
  "SunLong",
  "Seat",
  "SinoTruck VGV",
  "Saab",
  "Startech",
  "Sitech",
  "SHELBY",
  "ShuangHuan",
  "Skywell",
  "Speed Auto",
  "SuDa",
  "ShengTang",
  "Toyota",
  "Tesla",
  "Tank",
  "The Durant Guild",
  "Traum",
  "TaiRuiTe",
  "TongJia",
  "TECHART",
  "Volkswagen",
  "Volvo",
  "Voyah",
  "Venucia",
  "VGV",
  "Victory Auto",
  "Vulcanus",
  "WuLing",
  "WEY",
  "Weltmeister",
  "Wowsen",
  "WanXiang",
  "WinnerWay",
  "Xpeng",
  "XiaoHu EV",
  "Xinkai",
  "XingHaiShi",
  "YangWang",
  "Yudo",
  "Yema",
  "YuanChen",
  "Yufeng Auto",
  "YuTong",
  "YuanHang",
  "YaSheng",
  "Yuejin",
  "Zeekr",
  "Zotye",
  "ZD",
  "ZX AUTO",
  "Zedriv",
  "Zinoro",
];

const HELP_WHEN_EMPTY = `
  No brand logo URLs in the JSON file. AutoCango blocks the automated scraper, so
  you need to extract data in your real browser:

  1. Open https://www.autocango.com/ucbrand
  2. Click "Expand More" until all brands are visible.
  3. Open DevTools (F12) → Console.
  4. Paste and run the snippet from:
     scripts/autocango-extract-brands-console-snippet.js
  5. Copy the printed JSON and save it to:
     scripts/output-autocango-brands.json
  6. Run this script again: npx tsx scripts/scrape-autocango-logos.ts
`;

async function loadScrapedBrandLogos(): Promise<BrandLogo[]> {
  const envPath = process.env.BRAND_LOGOS_JSON;
  const jsonPath = (() => {
    if (!envPath) return resolve(projectRoot, "scripts", "output-autocango-brands.json");
    if (isAbsolute(envPath)) return envPath;
    // Treat any relative path (with or without "./") as relative to the repo root.
    return resolve(projectRoot, envPath);
  })();
  if (!existsSync(jsonPath)) {
    throw new Error(
      `Brand logos JSON not found at ${jsonPath}. ${HELP_WHEN_EMPTY}`,
    );
  }
  const raw = readFileSync(jsonPath, "utf8");
  let parsed: { name?: string; logoUrl?: string | null; count?: number }[];
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error(`Invalid JSON in ${jsonPath}. ${HELP_WHEN_EMPTY}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`JSON must be an array. ${HELP_WHEN_EMPTY}`);
  }
  const byName = new Map<string, string>();
  for (const entry of parsed) {
    const name = entry?.name?.trim();
    const logoUrl = entry?.logoUrl?.trim();
    if (name && logoUrl && !byName.has(name)) {
      byName.set(name, logoUrl);
    }
  }
  return Array.from(byName.entries()).map(([name, logoUrl]) => ({ name, logoUrl }));
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image ${url}: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function main() {
  console.log("Config:", { projectId, dataset, dryRun: !!dryRun });

  console.log("Loading scraped brand logos...");
  const scraped = await loadScrapedBrandLogos();
  console.log(`Loaded ${scraped.length} unique brand logo entries.`);
  if (scraped.length === 0) {
    console.warn(HELP_WHEN_EMPTY);
    console.log("No logos to apply. Exiting.");
    return;
  }

  const scrapedMap = new Map<string, string>();
  for (const entry of scraped) {
    scrapedMap.set(entry.name, entry.logoUrl);
  }

  const brands = await client.fetch<
    { _id: string; title: string; logo?: unknown }[]
  >(
    '*[_type == "brand" && title in $allowed]{ _id, title, logo }',
    { allowed: ALLOWED_BRANDS },
  );

  console.log(`Found ${brands.length} whitelisted brands in Sanity.`);

  const missingLogo = brands.filter((b) => !b.logo);
  console.log(
    `Brands with no logo in Sanity: ${missingLogo.length} / ${brands.length}`,
  );

  for (const brand of missingLogo) {
    const logoUrl = scrapedMap.get(brand.title);
    if (!logoUrl) {
      console.warn(
        `  ⚠️  No scraped logo URL found for brand "${brand.title}". Skipping.`,
      );
      continue;
    }

    console.log(`  → ${dryRun ? "Would set" : "Setting"} logo for ${brand.title} from ${logoUrl}`);

    if (dryRun) continue;

    try {
      const imageBuffer = await downloadImage(logoUrl);
      const asset = await client.assets.upload("image", imageBuffer, {
        filename: `${brand.title.replace(/\s+/g, "-").toLowerCase()}.webp`,
      });
      await client
        .patch(brand._id)
        .set({
          logo: {
            _type: "image",
            asset: { _type: "reference", _ref: asset._id },
          },
        })
        .commit();
      console.log(`    ✅ Updated logo for ${brand.title}`);
    } catch (err) {
      console.error(`    ❌ Failed to update logo for ${brand.title}:`, err);
    }
  }

  console.log("Done processing brand logos.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

