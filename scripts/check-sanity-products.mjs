import { createClient } from "@sanity/client";

const client = createClient({
    projectId: "fhp2b1rf",
    dataset: "production",
    apiVersion: "2021-10-21",
    token:
        "skEJm2EaqYZlqJ2Qa69rokpA7PyuwymRkyZRcDRhWPHtsHRoFpgacFXJMhDYDEjVI2xzAHo3OKqL9n3Y4YlBvCzzGuWHRTOfQJIpfKT9VIxgbvwS2nwgsCdHqCQC0V3FpicWVNAo1MrtK6DPp76QNpFmAEXMqhKQN9Sq6PR2rtAFjr0X92eW",
    useCdn: false,
});

async function main() {
    console.log("Querying Sanity (project: fhp2b1rf, dataset: production)...\n");

    // Count all document types
    const typeCounts = await client.fetch(`
    *[!(_id in path("_.**"))] | { "_type": _type } | group by _type {
      _type,
      "count": count()
    }
  `).catch(() => null);

    // Fallback: query each type individually
    const [vehicles, brands, vehicleCategories, vehicleTypes] = await Promise.all([
        client.fetch(`count(*[_type == "vehicle"])`),
        client.fetch(`count(*[_type == "brand"])`),
        client.fetch(`count(*[_type == "vehicleCategory"])`),
        client.fetch(`count(*[_type == "vehicleType"])`),
    ]);

    console.log("=== Document Counts ===");
    console.log(`  vehicles:         ${vehicles}`);
    console.log(`  brands:           ${brands}`);
    console.log(`  vehicleCategory:  ${vehicleCategories}`);
    console.log(`  vehicleType:      ${vehicleTypes}`);

    if (vehicles > 0) {
        const samples = await client.fetch(
            `*[_type == "vehicle"][0...5]{ _id, title, sku, price, model, year, fuelType }`
        );
        console.log("\n=== Sample Vehicles ===");
        samples.forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.title || "(no title)"} | SKU: ${v.sku || "-"} | ${v.year || "-"} | ${v.fuelType || "-"} | $${v.price ?? "-"}`);
        });
    } else {
        console.log("\n⚠️  No vehicle documents found in the production dataset.");
    }

    if (brands > 0) {
        const brandList = await client.fetch(`*[_type == "brand"][0...5]{ _id, name }`);
        console.log("\n=== Sample Brands ===");
        brandList.forEach((b, i) => console.log(`  ${i + 1}. ${b.name || b._id}`));
    }
}

main().catch(console.error);
