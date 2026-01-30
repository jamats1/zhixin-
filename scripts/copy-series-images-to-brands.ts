/**
 * One-off: copy vehicleSeries thumbnail + images (Additional images) into the
 * corresponding Brand's Logo and Thumbnail fields.
 *
 * For each Brand, finds vehicleSeries that reference it, takes the first
 * thumbnail and first gallery image, and sets Brand.logo and Brand.thumbnail.
 *
 * Env: .env.local with NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN.
 * Dry run: SCRAPE_DRY_RUN=1 pnpm exec tsx scripts/copy-series-images-to-brands.ts
 *
 * pnpm exec tsx scripts/copy-series-images-to-brands.ts
 */
import { config } from "dotenv";
import { existsSync } from "fs";
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

const projectRoot = findProjectRoot();
const cwd = process.cwd();
for (const root of [projectRoot, cwd]) {
  const envLocal = resolve(root, ".env.local");
  const envFile = resolve(root, ".env");
  if (existsSync(envLocal)) config({ path: envLocal, override: true });
  if (existsSync(envFile)) config({ path: envFile, override: true });
}

import { createClient } from "@sanity/client";

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "fhp2b1rf";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const token =
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN || process.env.SANITY_API_TOKEN;
const dryRun =
  process.env.SCRAPE_DRY_RUN === "1" || process.env.SCRAPE_DRY_RUN === "true" || !token;

if (!token) {
  console.warn("No token. Run with SCRAPE_DRY_RUN=1 to list only, or set token to apply.");
}

const client = createClient({
  projectId,
  dataset,
  token: token ?? undefined,
  apiVersion: "2024-01-01",
  useCdn: false,
});

type ImageRef = { _type: "image"; asset: { _type: "reference"; _ref: string } };

function toImageRef(assetRef: string | undefined): ImageRef | null {
  if (!assetRef || typeof assetRef !== "string") return null;
  return {
    _type: "image",
    asset: { _type: "reference", _ref: assetRef },
  };
}

const brandsQuery = `*[_type == "brand"] { _id, title }`;
const seriesForBrandQuery = `*[_type == "vehicleSeries" && brand._ref == $brandId] {
  "thumbnailRef": thumbnail.asset._ref,
  "imageRefs": images[].asset._ref
}[0...1]`;

async function main() {
  console.log("Config:", { projectId, dataset, dryRun: !!dryRun });
  const brands = await client.fetch<{ _id: string; title: string }[]>(brandsQuery);
  console.log(`Found ${brands.length} brands.`);
  let updated = 0;
  let skipped = 0;
  for (const brand of brands) {
    const series = await client.fetch<
      { thumbnailRef?: string; imageRefs?: (string | undefined)[] }[]
    >(seriesForBrandQuery, { brandId: brand._id });
    const first = series?.[0];
    if (!first) {
      skipped++;
      if (skipped <= 3) console.log(`  Skip ${brand.title}: no vehicleSeries`);
      continue;
    }
    const thumbnailRef = first.thumbnailRef;
    const imageRefs = (first.imageRefs ?? []).filter(Boolean) as string[];
    // Logo: prefer series thumbnail, else first gallery image. Thumbnail: prefer first gallery image, else series thumbnail.
    const logoRef = toImageRef(thumbnailRef ?? imageRefs[0]);
    const thumbRef = toImageRef(imageRefs[0] ?? thumbnailRef);
    if (!logoRef && !thumbRef) {
      skipped++;
      if (skipped <= 3) console.log(`  Skip ${brand.title}: no images in series`);
      continue;
    }
    if (dryRun) {
      console.log(
        `  Would set ${brand.title}: logo=${!!logoRef} thumbnail=${!!thumbRef}`,
      );
      updated++;
      continue;
    }
    try {
      const patch = client.patch(brand._id);
      if (logoRef) patch.set({ logo: logoRef });
      if (thumbRef) patch.set({ thumbnail: thumbRef });
      await patch.commit();
      updated++;
      if (updated % 10 === 0) console.log(`  Updated ${updated} brands...`);
    } catch (err) {
      console.error(`  Failed ${brand.title}:`, err);
    }
  }
  console.log(`Done. Updated ${updated} brands, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
