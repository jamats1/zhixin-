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
    "SANITY_API_TOKEN or NEXT_PUBLIC_SANITY_API_TOKEN is required in .env.local"
  );
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  token,
  useCdn: false,
});

function normalizeBrandName(name: string) {
  return name.trim().toLowerCase();
}

// e.g. "2019 Geely Emgrand 1.5L ..." → "Geely"
//      "2023 Mercedes-Benz E Class ..." → "Mercedes-Benz"
//      "2024 212 212 T01 2.0T ..."   → "212"
function inferBrandFromTitle(title: string): string | null {
  const match = title.match(/^\s*\d{4}\s+([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
}

async function main() {
  console.log("🔎 Loading brands…");

  const brands: { _id: string; title: string }[] = await client.fetch(
    `*[_type == "brand"]{_id, title}`
  );
  const brandMap = new Map(
    brands.map((b) => [normalizeBrandName(b.title), b._id])
  );

  console.log(`Found ${brands.length} brand docs in Sanity`);

  console.log("🔎 Loading vehicles missing brand…");
  const vehicles: { _id: string; title: string }[] = await client.fetch(
    `*[_type == "vehicle" && !defined(brand)]{_id, title}`
  );

  console.log(`Found ${vehicles.length} vehicles without brand reference`);

  let linked = 0;
  let skippedNoInference = 0;
  let skippedNoBrandDoc = 0;

  for (const v of vehicles) {
    const inferred = inferBrandFromTitle(v.title);
    if (!inferred) {
      skippedNoInference++;
      console.warn(`Could not infer brand from title: "${v.title}"`);
      continue;
    }

    const brandId = brandMap.get(normalizeBrandName(inferred));
    if (!brandId) {
      skippedNoBrandDoc++;
      console.warn(
        `No brand doc found for inferred "${inferred}" (title: "${v.title}")`
      );
      continue;
    }

    console.log(
      `Linking vehicle ${v._id} → brand "${inferred}" (${brandId})`
    );

    await client
      .patch(v._id)
      .set({
        brand: { _type: "reference", _ref: brandId },
      })
      .commit();

    linked++;
  }

  console.log("✅ Backfill complete.");
  console.log(
    `Linked: ${linked}, skipped (no brand in title): ${skippedNoInference}, skipped (no matching brand doc): ${skippedNoBrandDoc}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

