/**
 * run-scrapers-auto.ts
 *
 * Runs scrapers (and optional enrichment) in sequence for automation.
 * Use from cron, GitHub Actions, or: npm run scrape:auto
 *
 * Order: AutoCango used cars → (optional) China Crunch → (optional) ChinaTrucks → (optional) Enrich vehicles
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET,
 *      NEXT_PUBLIC_SANITY_API_TOKEN or SANITY_API_TOKEN.
 *      OPENAI_API_KEY optional for enrichment.
 */

import { spawn } from "node:child_process";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const ROOT = process.cwd();
const isWindows = process.platform === "win32";
const tsx = isWindows ? "npx.cmd" : "npx";
const tsxArgs = ["tsx"];

function run(
  script: string,
  args: string[] = []
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const fullArgs = [...tsxArgs, path.join(ROOT, "scripts", script), ...args];
    const proc = spawn(tsx, fullArgs, {
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
  const skipEnrich = process.argv.includes("--no-enrich");
  const skipChinaCrunch = process.argv.includes("--no-china-crunch");
  const skipChinaTrucks = process.argv.includes("--no-chinatrucks");
  const brandsOnly = process.argv.includes("--brands");

  console.log("🔄 Auto scrapers – starting\n");

  // 1. AutoCango (used cars or brands)
  console.log("─── 1/3 AutoCango ───");
  const ac = await run(
    "scrape-autocango.ts",
    brandsOnly ? ["--brands"] : []
  );
  if (ac.code !== 0) {
    console.error("\n❌ AutoCango failed. Stopping.");
    process.exit(ac.code);
  }

  // 2. China Crunch (optional)
  if (!skipChinaCrunch) {
    console.log("\n─── 2/3 China Crunch ───");
    const cc = await run("scrape-china-crunch.ts");
    if (cc.code !== 0) {
      console.warn("\n⚠ China Crunch failed (non-fatal). Continuing.");
    }
  } else {
    console.log("\n─── 2/3 China Crunch (skipped) ───");
  }

  // 3. ChinaTrucks (optional)
  if (!skipChinaTrucks) {
    console.log("\n─── 3/4 ChinaTrucks ───");
    const ct = await run("scrape-chinatrucks.ts");
    if (ct.code !== 0) {
      console.warn("\n⚠ ChinaTrucks failed (non-fatal). Continuing.");
    }
  } else {
    console.log("\n─── 3/4 ChinaTrucks (skipped) ───");
  }

  // 4. Enrich vehicles (optional)
  if (!skipEnrich) {
    console.log("\n─── 4/4 Enrich vehicles ───");
    const en = await run("enrich-vehicle-documents.ts");
    if (en.code !== 0) {
      console.warn("\n⚠ Enrich failed (non-fatal).");
    }
  } else {
    console.log("\n─── 4/4 Enrich (skipped) ───");
  }

  console.log("\n✅ Auto scrapers finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
