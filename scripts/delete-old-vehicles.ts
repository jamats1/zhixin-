import { createClient } from "@sanity/client";
import * as dotenv from "dotenv";
import * as path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SANITY_PROJECT_ID =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const SANITY_TOKEN = process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

if (!SANITY_TOKEN) {
  console.error(
    "❌  NEXT_PUBLIC_SANITY_API_TOKEN is missing from .env.local. Aborting.",
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

async function main() {
  const today =
    process.argv
      .find((arg) => arg.startsWith("--date="))
      ?.split("=")[1] || new Date().toISOString().slice(0, 10);

  console.log(`🧹  Deleting vehicle docs not scraped on ${today}...`);

  const oldVehicles = await sanity.fetch<{ _id: string; scrapedAt?: string }[]>(
    '*[_type == "vehicle" && (scrapedAt != $today || !defined(scrapedAt))]{ _id, scrapedAt }',
    { today },
  );

  if (oldVehicles.length === 0) {
    console.log("  → No old vehicle documents to delete.");
    return;
  }

  console.log(`  → Found ${oldVehicles.length} old vehicle documents.`);

  const tx = sanity.transaction();
  for (const v of oldVehicles) {
    tx.delete(v._id);
  }

  await tx.commit();
  console.log(`  ✅  Deleted ${oldVehicles.length} old vehicle documents.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

