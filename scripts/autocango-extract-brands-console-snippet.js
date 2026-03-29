/**
 * Run this in the browser console on https://www.autocango.com/ucbrand
 * after ALL letter sections are visible (otherwise you get missing letters).
 *
 * 1. Open https://www.autocango.com/ucbrand
 * 2. Click "Expand More" / "All Brands" until every letter section is loaded:
 *    you should see 2, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, V, W, X, Y, Z.
 * 3. (Optional) Scroll down so lazy-loaded images (e.g. T–Z) load; more logos = better.
 * 4. Open DevTools (F12) → Console.
 * 5. Paste this entire file and press Enter.
 * 6. Check "Letters found" — should list 2,A,B,...,Z. If any letter is missing, expand/scroll and re-run.
 * 7. Copy the printed JSON array and save as scripts/output-autocango-brands.json
 * 8. Run: npx tsx scripts/scrape-autocango-logos.ts
 *    (entries with no logoUrl are skipped; scroll to load images and re-run snippet to get more logos)
 */
(function () {
  function makeAbsolute(src) {
    if (!src) return null;
    if (src.startsWith("http")) return src;
    try {
      return new URL(src, "https://www.autocango.com").href;
    } catch (e) {
      return null;
    }
  }

  const byName = new Map();

  var links = document.querySelectorAll("div.app-container ul.grid-list li a");
  links.forEach(function (link) {
    var nameEl = link.querySelector("p.name");
    var name = nameEl ? nameEl.textContent.trim() : "";
    if (!name) return;

    var numEl = link.querySelector("p.num");
    var count = 0;
    if (numEl) {
      count = parseInt((numEl.textContent || "").replace(/\D/g, ""), 10) || 0;
    } else {
      var m = (link.textContent || "").trim().match(/\((\d+)\)/);
      if (m) count = parseInt(m[1], 10);
    }

    var img =
      link.querySelector("div.el-image img.el-image__inner") ||
      link.querySelector("img.el-image__inner") ||
      link.querySelector("img");
    var logoUrl = null;
    if (img) {
      logoUrl = makeAbsolute(
        img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original")
      );
    }

    var existing = byName.get(name);
    var keepThis = !existing;
    if (existing) {
      if (logoUrl && !existing.logoUrl) keepThis = true;
      else if (logoUrl && existing.logoUrl && count > existing.count) keepThis = true;
      else if (!logoUrl && existing.logoUrl) keepThis = false;
      else if (count > existing.count) keepThis = true;
    }
    if (keepThis) {
      byName.set(name, { name: name, count: count, logoUrl: logoUrl || null });
    }
  });

  var arr = Array.from(byName.values());
  var letters = [...new Set(arr.map(function (b) {
    var c = (b.name || "").charAt(0).toUpperCase();
    return c >= "A" && c <= "Z" ? c : (b.name || "").match(/^\d/) ? "2" : c;
  }))].sort();
  var withLogo = arr.filter(function (b) { return b.logoUrl; }).length;
  console.log("Brands found: " + arr.length + " | With logo: " + withLogo + " | Letters: " + letters.join(", "));
  if (arr.length < 200) {
    console.warn("⚠️ Only " + arr.length + " brands. Expand all letter sections (2,A–Z) and run again.");
  }
  if (withLogo < arr.length) {
    console.warn("⚠️ " + (arr.length - withLogo) + " brands have no logo (lazy-loaded). Scroll the page to load images, then run this again.");
  }
  console.log(JSON.stringify(arr, null, 2));
  console.log("\n--- Copy the JSON array above and save as scripts/output-autocango-brands.json ---");
  return arr;
})();
