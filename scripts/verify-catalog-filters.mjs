import assert from "node:assert/strict";
import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

const sanity = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  perspective: "published",
});

async function main() {
  console.log(`Verifying against Sanity: ${projectId}/${dataset}`);

  const brand = await sanity.fetch(
    `*[_type == "brand"] | order(order asc, _createdAt asc)[0]{ _id, title }`,
  );
  assert.ok(brand?._id, "Expected at least one brand doc");

  const carPartWithBrand = await sanity.fetch(
    `*[_type == "carPart" && inStock == true && defined(brand._ref)][0]{ "brandId": brand._ref }`,
  );

  const carPartCategory = await sanity.fetch(
    `*[_type == "carPartCategory"] | order(order asc, _createdAt asc)[0]{ _id, title }`,
  );
  assert.ok(
    carPartCategory?._id,
    "Expected at least one carPartCategory doc (run migration first)",
  );

  const totalCarParts = await sanity.fetch(
    `count(*[_type == "carPart" && inStock == true])`,
  );

  const filteredByBrand = await sanity.fetch(
    `count(*[_type == "carPart" && inStock == true && brand._ref == $brandId])`,
    { brandId: carPartWithBrand?.brandId ?? brand._id },
  );

  const filteredByCategory = await sanity.fetch(
    `count(*[_type == "carPart" && inStock == true && category._ref == $catId])`,
    { catId: carPartCategory._id },
  );

  console.log({
    totalCarParts,
    filteredByBrand,
    filteredByCategory,
    sampleBrand: carPartWithBrand?.brandId ? "(from carPart.brand._ref)" : brand.title,
    sampleCategory: carPartCategory.title,
  });

  assert.ok(
    totalCarParts >= 0 && filteredByBrand >= 0 && filteredByCategory >= 0,
    "Counts should be numbers",
  );

  if (carPartWithBrand?.brandId) {
    assert.ok(filteredByBrand > 0, "Expected brand filter to match >0 car parts");
  }

  // Search verification: pick a token from an existing car part name if any
  const samplePart = await sanity.fetch(
    `*[_type == "carPart" && defined(name) && inStock == true][0]{ name }`,
  );
  if (samplePart?.name) {
    const token = String(samplePart.name).split(/\s+/).find((t) => t.length >= 3);
    if (token) {
      const searchCount = await sanity.fetch(
        `count(*[_type == "carPart" && inStock == true && name match $p])`,
        { p: `*${token}*` },
      );
      console.log({ searchToken: token, searchCount });
      assert.ok(searchCount > 0, "Expected search to return at least 1 result");
    }
  }

  console.log("OK: sanity filter/search basics respond");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

