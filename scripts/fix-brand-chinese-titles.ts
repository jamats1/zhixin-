/**
 * One-off: patch existing Sanity brand documents that have Chinese titles
 * to English title + slug. Run with same env as scrape-autohome-brands
 * (NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN).
 *
 * pnpm exec tsx scripts/fix-brand-chinese-titles.ts
 */
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import slugify from "slugify";

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
  if (existsSync(envLocal)) config({ path: envLocal, override: false });
  if (existsSync(envFile)) config({ path: envFile, override: false });
}

import { createClient } from "@sanity/client";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "fhp2b1rf";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const token =
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN || process.env.SANITY_API_TOKEN;

if (!token) {
  console.error("Set NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN in .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2024-01-01",
  useCdn: false,
});

const CHINESE_TO_ENGLISH: Record<string, string> = {
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
};

function toSlug(title: string): string {
  const s = slugify(title, { lower: true, strict: true });
  return s || "brand";
}

function getEnglishTitle(chineseTitle: string): string {
  const exact = CHINESE_TO_ENGLISH[chineseTitle];
  if (exact) return exact;
  for (const [zh, en] of Object.entries(CHINESE_TO_ENGLISH)) {
    if (chineseTitle.includes(zh)) return en;
  }
  return chineseTitle;
}

const BRAND_IDS_TO_FIX = [
  "brand.autohome.113",
  "brand.autohome.114",
  "brand.autohome.142",
  "brand.autohome.161",
  "brand.autohome.163",
  "brand.autohome.165",
  "brand.autohome.187",
  "brand.autohome.19",
  "brand.autohome.25",
  "brand.autohome.259",
  "brand.autohome.26",
  "brand.autohome.272",
  "brand.autohome.279",
  "brand.autohome.283",
  "brand.autohome.284",
  "brand.autohome.291",
  "brand.autohome.294",
  "brand.autohome.299",
  "brand.autohome.309",
  "brand.autohome.318",
  "brand.autohome.32",
  "brand.autohome.331",
  "brand.autohome.345",
  "brand.autohome.373",
  "brand.autohome.406",
  "brand.autohome.425",
  "brand.autohome.437",
  "brand.autohome.451",
  "brand.autohome.456",
  "brand.autohome.487",
  "brand.autohome.530",
  "brand.autohome.536",
  "brand.autohome.575",
  "brand.autohome.582",
  "brand.autohome.597",
  "brand.autohome.609",
  "brand.autohome.614",
  "brand.autohome.634",
  "brand.autohome.76",
  "brand.autohome.77",
  "brand.autohome.91",
];

async function main() {
  const docs = await client.fetch<
    { _id: string; title: string | null }[]
  >(`*[_type == "brand" && _id in $ids]{ _id, title }`, {
    ids: BRAND_IDS_TO_FIX,
  });

  const toPatch: { id: string; title: string; slug: string }[] = [];
  for (const d of docs) {
    const title = d.title?.trim() ?? "";
    const en = getEnglishTitle(title);
    if (en === title && !/[一-龥]/.test(title)) continue;
    toPatch.push({ id: d._id, title: en, slug: toSlug(en) });
  }

  console.log("Patching", toPatch.length, "brands (title + slug)...");
  for (const { id, title, slug } of toPatch) {
    await client
      .patch(id)
      .set({
        title,
        slug: { _type: "slug" as const, current: slug },
      })
      .commit();
    console.log("Patched:", id, "->", title, slug);
  }

  console.log("Publishing drafts...");
  const publishMutations = toPatch.map(({ id }) => ({ publish: { id } }));
  await client.request({
    url: `/data/mutate/${dataset}`,
    method: "POST",
    body: { mutations: publishMutations },
  });
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
