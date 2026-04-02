/**
 * One-time migration: convert legacy carPart.brand/category strings into references.
 *
 * Requires SANITY_API_TOKEN (or NEXT_PUBLIC_SANITY_API_TOKEN) in .env.local.
 *
 * Run:
 *   npx tsx scripts/migrate-carparts-to-refs.ts
 *
 * Notes:
 * - Creates/updates `carPartCategory` docs for every observed legacy category key.
 * - Patches `carPart` docs:
 *   - Sets `legacyBrandText` / `legacyCategoryKey` (hidden fields) for rollback traceability
 *   - Sets `brand` (ref -> brand) when match found
 *   - Sets `category` (ref -> carPartCategory) when match found
 */
import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token =
  process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

if (!token) {
  console.error(
    "SANITY_API_TOKEN or NEXT_PUBLIC_SANITY_API_TOKEN is required in .env.local",
  );
  process.exit(1);
}

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
});

type BrandDoc = { _id: string; title: string; slug: string | null };
type CarPartRow = {
  _id: string;
  brand?: unknown;
  category?: unknown;
};

const PATCH_BATCH_SIZE = 50;

const CATEGORY_LABELS: Record<string, { title: string; order: number }> = {
  engine: { title: "Engine", order: 10 },
  transmission: { title: "Transmission", order: 20 },
  axle: { title: "Axle", order: 30 },
  tire: { title: "Tire", order: 40 },
  retarder: { title: "Retarder", order: 50 },
  other: { title: "Other parts", order: 60 },
  lighting: { title: "Lighting", order: 70 },
  "body-panel": { title: "Body / panels", order: 80 },
  glass: { title: "Glass", order: 90 },
  filter: { title: "Filters", order: 100 },
  wheel: { title: "Wheels", order: 110 },
  accessory: { title: "Accessories", order: 120 },
  "other-retail": { title: "Other retail", order: 130 },
};

function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeBrand(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[’']/g, "")
    .replace(/&/g, "and");
}

function slugFromTitle(title: string): string {
  return normalizeKey(title.replace(/&/g, "and"));
}

async function upsertCategoryDoc(sourceKey: string) {
  const key = normalizeKey(sourceKey);
  const meta = CATEGORY_LABELS[key] ?? {
    title: sourceKey.trim() || key,
    order: 999,
  };
  const docId = `carPartCategory-${key}`.slice(0, 128);
  await sanity.createOrReplace({
    _id: docId,
    _type: "carPartCategory",
    title: meta.title,
    slug: { _type: "slug", current: slugFromTitle(meta.title) },
    sourceKey: key,
    order: meta.order,
  });
  return docId;
}

async function main() {
  console.log(`Using Sanity: ${projectId}/${dataset}`);

  const brands = await sanity.fetch<BrandDoc[]>(
    `*[_type == "brand"]{ _id, title, "slug": slug.current }`,
  );
  const brandByNormTitle = new Map<string, BrandDoc>();
  const brandBySlug = new Map<string, BrandDoc>();
  for (const b of brands) {
    brandByNormTitle.set(normalizeBrand(b.title), b);
    if (b.slug) brandBySlug.set(String(b.slug).toLowerCase(), b);
  }

  const rows = await sanity.fetch<CarPartRow[]>(
    `*[_type == "carPart"]{ _id, brand, category }`,
  );
  console.log(`Found ${rows.length} carPart docs`);

  // Collect legacy category keys (string-only).
  const legacyCategoryKeys = new Set<string>();
  for (const r of rows) {
    if (typeof r.category === "string" && r.category.trim()) {
      legacyCategoryKeys.add(r.category.trim());
    }
  }

  console.log(`Upserting ${legacyCategoryKeys.size} carPartCategory docs…`);
  const categoryRefByKey = new Map<string, string>();
  for (const rawKey of [...legacyCategoryKeys].sort()) {
    const key = normalizeKey(rawKey);
    const id = await upsertCategoryDoc(key);
    categoryRefByKey.set(key, id);
  }

  let patched = 0;
  let skippedAlreadyRefs = 0;
  const missingBrand: Array<{ id: string; legacyBrand: string }> = [];
  const missingCategory: Array<{ id: string; legacyCategory: string }> = [];

  console.log("Patching carPart docs…");
  let tx = sanity.transaction();
  let pendingInTx = 0;
  let processed = 0;

  async function commitTxIfNeeded(force = false) {
    if (pendingInTx === 0) return;
    if (!force && pendingInTx < PATCH_BATCH_SIZE) return;
    await tx.commit({ autoGenerateArrayKeys: true });
    tx = sanity.transaction();
    pendingInTx = 0;
  }

  for (const r of rows) {
    processed++;
    const brandIsRef =
      typeof r.brand === "object" &&
      r.brand != null &&
      (r.brand as any)._type === "reference";
    const categoryIsRef =
      typeof r.category === "object" &&
      r.category != null &&
      (r.category as any)._type === "reference";

    if (brandIsRef && categoryIsRef) {
      skippedAlreadyRefs++;
      continue;
    }

    const legacyBrand = typeof r.brand === "string" ? r.brand.trim() : "";
    const legacyCategory =
      typeof r.category === "string" ? r.category.trim() : "";

    const setPayload: Record<string, unknown> = {};
    if (legacyBrand) setPayload.legacyBrandText = legacyBrand;
    if (legacyCategory) setPayload.legacyCategoryKey = legacyCategory;

    if (!categoryIsRef && legacyCategory) {
      const key = normalizeKey(legacyCategory);
      const categoryId = categoryRefByKey.get(key);
      if (categoryId) {
        setPayload.category = { _type: "reference", _ref: categoryId };
      } else {
        missingCategory.push({ id: r._id, legacyCategory });
      }
    }

    if (!brandIsRef && legacyBrand) {
      const norm = normalizeBrand(legacyBrand);
      const slugGuess = normalizeKey(legacyBrand);
      const hit =
        brandByNormTitle.get(norm) ||
        brandBySlug.get(slugGuess) ||
        brandBySlug.get(slugGuess.replace(/-+/g, "-"));
      if (hit) {
        setPayload.brand = { _type: "reference", _ref: hit._id };
      } else {
        missingBrand.push({ id: r._id, legacyBrand });
      }
    }

    const willPatch =
      Object.prototype.hasOwnProperty.call(setPayload, "brand") ||
      Object.prototype.hasOwnProperty.call(setPayload, "category") ||
      Object.prototype.hasOwnProperty.call(setPayload, "legacyBrandText") ||
      Object.prototype.hasOwnProperty.call(setPayload, "legacyCategoryKey");

    if (!willPatch) continue;

    tx = tx.patch(r._id, (p) => p.set(setPayload));
    pendingInTx++;
    patched++;

    if (patched % 250 === 0) {
      console.log(
        `Progress: patched=${patched}, processed=${processed}/${rows.length}`,
      );
    }
    await commitTxIfNeeded(false);
  }

  await commitTxIfNeeded(true);

  console.log("Migration summary:");
  console.log(
    JSON.stringify(
      {
        patched,
        skippedAlreadyRefs,
        missingBrandCount: missingBrand.length,
        missingCategoryCount: missingCategory.length,
        missingBrandSample: missingBrand.slice(0, 20),
        missingCategorySample: missingCategory.slice(0, 20),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

