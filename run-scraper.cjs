/**
 * Launcher: loads .env.local from project root then runs the scraper.
 * Ensures env is available when running via "npm run scrape:autohome".
 */
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = __dirname;
require("dotenv").config({ path: path.join(projectRoot, ".env.local"), override: true });
require("dotenv").config({ path: path.join(projectRoot, ".env"), override: true });

const result = spawnSync(
  "npx",
  ["tsx", "scripts/scrape-autohome-series.ts", ...process.argv.slice(2)],
  { stdio: "inherit", env: process.env, cwd: projectRoot, shell: true }
);
process.exit(result.status ?? 1);
