/**
 * scrape-autocango-multi-brand.ts
 *
 * Runs the AutoCango scraper for a list of brands sequentially.
 *
 * Usage:
 *   npx tsx scripts/scrape-autocango-multi-brand.ts
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 *      NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN.
 */

import { spawn } from "node:child_process";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const ROOT = process.cwd();
const isWindows = process.platform === "win32";
const tsx = isWindows ? "npx.cmd" : "npx";
const tsxArgs = ["tsx"];

// Edit this list to control which brands are scraped
const BRANDS: string[] = [
  "Haval",
  "Honda",
  "ChangAn",
  "Chery",
  "Chevrolet",
  "Deepal",
  "DENZA",
  "Exeed",
  "Ford",
  "GAC",
  "Geely",
  "Great Wall",
  "HIMA",
  "NIO",
  "Xpeng",
  "Zeekr",
  "Tesla",
  "MI",
];

function runScraperForBrand(
  brandName: string
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.join(ROOT, "scripts", "scrape-autocango.ts");
    const args = [...tsxArgs, scriptPath, `--brandName=${brandName}`];

    const proc = spawn(tsx, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
      shell: isWindows,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (d) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
      process.stderr.write(d);
    });

    proc.on("close", (code, signal) => {
      resolve({
        code: code ?? (signal ? 1 : 0),
        stdout,
        stderr,
      });
    });

    proc.on("error", (err) => {
      process.stderr.write(String(err));
      resolve({ code: 1, stdout, stderr });
    });
  });
}

async function main() {
  console.log("🔄 AutoCango multi-brand scrape – starting\n");

  for (const brand of BRANDS) {
    console.log(`\n=== Scraping brand: ${brand} ===`);
    const result = await runScraperForBrand(brand);

    if (result.code !== 0) {
      console.warn(
        `⚠ Scrape for brand "${brand}" exited with code ${result.code}. Continuing to next brand.`
      );
    } else {
      console.log(`✅ Finished brand "${brand}"`);
    }
  }

  console.log("\n✅ AutoCango multi-brand scrape finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

