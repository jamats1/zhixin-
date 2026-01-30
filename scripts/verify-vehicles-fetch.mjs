/**
 * Verifies that the Sanity API returns vehicleSeries with the same config as the app.
 * Run from project root: node scripts/verify-vehicles-fetch.mjs
 * Loads .env.local so NEXT_PUBLIC_SANITY_* are set (same as frontend).
 */
import { config } from "dotenv";
import { createClient } from "@sanity/client";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envLocal = resolve(root, ".env.local");
if (existsSync(envLocal)) {
  config({ path: envLocal, override: true });
}
config({ path: resolve(root, ".env"), override: true });

const projectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "fhp2b1rf";
const dataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET || process.env.SANITY_DATASET || "production";
const token =
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN || process.env.SANITY_API_TOKEN || null;

const client = createClient({
  projectId,
  dataset,
  useCdn: false,
  apiVersion: "2024-01-01",
  perspective: "published",
  ...(token ? { token } : {}),
});

// Same GROQ as vehicleSeriesByFiltersQuery with no filters (first page)
const query = `*[_type == "vehicleSeries"] | order(title asc) [$start...$end] {
  _id,
  title,
  "slug": slug.current,
  thumbnail,
  images[] { asset-> },
  priceRange,
  isOnSale,
  isNewEnergy,
  tagline,
  "category": category->{ _id, title, "slug": slug.current },
  "type": type->{ _id, title, "slug": slug.current },
  "brand": brand->{ _id, title, "slug": slug.current }
}`;
const params = { start: 0, end: 20 };

const countQuery = `count(*[_type == "vehicleSeries"])`;

async function main() {
  console.log("Sanity config:", { projectId, dataset, withToken: !!token });
  try {
    const [list, count] = await Promise.all([
      client.fetch(query, params),
      client.fetch(countQuery),
    ]);
    console.log("vehicleSeries count (total):", count);
    console.log("vehicleSeries fetched (first page):", list?.length ?? 0);
    if (list?.length) {
      console.log("First 3 titles:", list.slice(0, 3).map((d) => d?.title));
    }
    if (count > 0 && (!list || list.length === 0)) {
      console.error("FAIL: API returns count but list is empty. Check query/params.");
      process.exit(1);
    }
    if (count === 0 && list?.length === 0) {
      console.warn(
        "No vehicleSeries in dataset. If Studio shows content, the dataset may be private: set NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN in .env.local and run again.",
      );
    } else {
      console.log("OK: Fetch matches app query.");
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
    process.exit(1);
  }
}

main();
