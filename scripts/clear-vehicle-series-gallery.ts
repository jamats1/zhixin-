/**
 * One-off: clear thumbnail and images on all vehicleSeries documents.
 * Cards now use brand logo; this removes wrong gallery content from Sanity.
 *
 * Env: .env.local with NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN.
 * Dry run: SCRAPE_DRY_RUN=1 pnpm exec tsx scripts/clear-vehicle-series-gallery.ts
 *
 * pnpm exec tsx scripts/clear-vehicle-series-gallery.ts
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

const idsQuery = `*[_type == "vehicleSeries"]._id`;

async function main() {
  console.log("Config:", { projectId, dataset, dryRun: !!dryRun });
  const ids = await client.fetch<string[]>(idsQuery);
  console.log(`Found ${ids.length} vehicleSeries documents.`);
  if (ids.length === 0) {
    console.log("Nothing to do.");
    return;
  }
  if (dryRun) {
    console.log("Dry run: would unset thumbnail and images on:", ids.slice(0, 5).join(", "), ids.length > 5 ? "..." : "");
    return;
  }
  let done = 0;
  for (const id of ids) {
    try {
      await client.patch(id).unset(["thumbnail", "images"]).commit();
      done++;
      if (done % 20 === 0) console.log(`Patched ${done}/${ids.length}...`);
    } catch (err) {
      console.error(`Failed to patch ${id}:`, err);
    }
  }
  console.log(`Done. Cleared thumbnail and images on ${done} vehicleSeries.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
