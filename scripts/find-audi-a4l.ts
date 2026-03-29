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
  console.log('🔎  Searching for documents containing "Audi A4L"...');

  const docs = await sanity.fetch<
    { _id: string; _type: string; title?: string; model?: string; sku?: string }[]
  >(
    `*[_type in ["vehicleSeries", "vehicle"] && (
        title match "Audi A4L*" ||
        model match "Audi A4L*" ||
        sku match "Audi A4L*"
      )]{
        _id,
        _type,
        title,
        model,
        sku
      }`,
  );

  if (docs.length === 0) {
    console.log("  → No matching vehicle or vehicleSeries documents found.");
    return;
  }

  console.log(`  → Found ${docs.length} matching document(s):`);
  for (const d of docs) {
    console.log(
      `    • ${d._id} [${d._type}] title="${d.title || ""}" model="${
        d.model || ""
      }" sku="${d.sku || ""}"`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

