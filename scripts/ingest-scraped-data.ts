import { createClient } from "@sanity/client";
import * as path from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token =
    process.env.SANITY_API_TOKEN || process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

const client = token
    ? createClient({
          projectId,
          dataset,
          apiVersion: "2024-01-01",
          token,
          useCdn: false,
      })
    : null;

// Ingestion script for scraped vehicle data. Run with SANITY_API_TOKEN or NEXT_PUBLIC_SANITY_API_TOKEN.
// if token is provided via env var, this will work.

const scrapedData = {
    "listings": [
        {
            "title": "2018 Audi A6 3.0T 333HP V6 7DCT",
            "price": 38665,
            "year": 2018,
            "registrationYear": "2019-01",
            "mileage": 110000,
            "sku": "ACU90033121",
            "link": "https://www.autocango.com/sku/usedcar-Audi-A6-ACU90033121",
            "body_type": "Wagon",
            "seats": 5,
            "doors": 5,
            "weight": 2000,
            "fuel_type": "Petrol",
            "engine_displacement": "3.0T (333HP V6)",
            "transmission": "DCT",
            "drivetrain": "4WD/AWD",
            "features": [
                "Sun Roof", "Leather Seat", "Power Seat", "Seat Heating",
                "Alloy Wheel", "Power Window", "Auto A/C", "ABS",
                "Driver Airbag", "Adaptive Cruise", "Side Airbag", "Tire Pressure Monitor"
            ],
            "brand_name": "Audi"
        },
        {
            "title": "Nio ET9 (2025)",
            "price": 110950,
            "year": 2025,
            "fuel_type": "BEV",
            "isNewEnergy": true,
            "brand_name": "Nio"
        },
        {
            "title": "Geely Xingyuan (2026)",
            "price": 9750,
            "year": 2026,
            "fuel_type": "BEV",
            "isNewEnergy": true,
            "brand_name": "Geely"
        },
        {
            "title": "BYD Seal (2025)",
            "price": 24100,
            "year": 2025,
            "fuel_type": "BEV",
            "isNewEnergy": true,
            "brand_name": "BYD"
        }
    ]
};

async function ingest() {
    if (!client || !token) {
        console.error(
            "Missing SANITY_API_TOKEN or NEXT_PUBLIC_SANITY_API_TOKEN. Set one in .env.local to run this script."
        );
        process.exit(1);
    }

    console.log("Starting ingestion...");

    const slugify = (t: string) =>
        t.replace(/\s+/g, "-").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "vehicle";
    const uniqueSlug = (t: string, id: string) =>
        slugify(t) || id.replace(/^vehicle-/, "") || "vehicle";

    for (const item of scrapedData.listings) {
        const safeId = item.sku
            ? `vehicle-${item.sku}`
            : `vehicle-${slugify(item.title) || "listing"}`;
        const slugCurrent = uniqueSlug(item.title, safeId);

        const doc = {
            _type: "vehicle",
            _id: safeId,
            title: item.title,
            slug: { _type: "slug", current: slugCurrent },
            ...(item.price != null && { price: item.price }),
            ...(item.year != null && { year: item.year }),
            ...(item.registrationYear != null && { registrationYear: item.registrationYear }),
            ...(item.mileage != null && { mileage: item.mileage }),
            ...(item.sku != null && item.sku !== "" && { sku: item.sku }),
            ...(item.fuel_type != null && item.fuel_type !== "" && { fuelType: item.fuel_type }),
            ...(item.engine_displacement != null && { engineDisplacement: item.engine_displacement }),
            ...(item.transmission != null && { transmission: item.transmission }),
            ...(item.body_type != null && { bodyType: item.body_type }),
            ...(item.seats != null && { seats: item.seats }),
            ...(item.doors != null && { doors: item.doors }),
            ...(item.weight != null && { weightKg: item.weight }),
            ...(item.drivetrain != null && { drivetrain: item.drivetrain }),
            features: Array.isArray(item.features) ? item.features : undefined,
            isOnSale: true,
            isNewEnergy: item.isNewEnergy ?? ["BEV", "PHEV"].includes(item.fuel_type),
            scrapedAt: new Date().toISOString().slice(0, 10),
        };

        try {
            await client.createOrReplace(doc);
            console.log(`Created/Updated document: ${doc.title}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`Failed to ingest ${doc.title}:`, msg);
        }
    }
}

// ingest();
console.log("Ingestion script ready. Run with SANITY_API_TOKEN environmental variable.");
