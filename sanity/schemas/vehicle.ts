import { defineField, defineType } from "sanity";

export default defineType({
  name: "vehicle",
  title: "Vehicle (Scraped)",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "title",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "brand",
      title: "Brand",
      type: "reference",
      to: [{ type: "brand" }],
    }),
    defineField({
      name: "model",
      title: "Model",
      type: "string",
    }),
    defineField({
      name: "year",
      title: "Manufacturing Year",
      type: "number",
    }),
    defineField({
      name: "registrationYear",
      title: "Registration Year",
      type: "string",
      description: "e.g. 2022-06",
    }),
    defineField({
      name: "mileage",
      title: "Mileage (km)",
      type: "number",
    }),
    defineField({
      name: "fuelType",
      title: "Fuel Type",
      type: "string",
      description: "e.g. BEV, PHEV, Petrol",
    }),
    defineField({
      name: "engineDisplacement",
      title: "Engine Displacement (cc)",
      type: "string",
    }),
    defineField({
      name: "transmission",
      title: "Transmission",
      type: "string",
      description: "e.g. AT, MT, DCT",
    }),
    defineField({
      name: "price",
      title: "Price (USD)",
      type: "number",
    }),
    defineField({
      name: "sku",
      title: "SKU / ID",
      type: "string",
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "vehicleCategory" }],
    }),
    defineField({
      name: "bodyType",
      title: "Body Type",
      type: "string",
    }),
    defineField({
      name: "seats",
      title: "Seats",
      type: "number",
    }),
    defineField({
      name: "doors",
      title: "Doors",
      type: "number",
    }),
    defineField({
      name: "weightKg",
      title: "Weight (kg)",
      type: "number",
    }),
    defineField({
      name: "batteryCapacityKwh",
      title: "Battery Capacity (kWh)",
      type: "number",
    }),
    defineField({
      name: "rangeKm",
      title: "Range (km)",
      type: "number",
    }),
    defineField({
      name: "drivetrain",
      title: "Drivetrain",
      type: "string",
      description: "e.g. 2WD, 4WD",
    }),
    defineField({
      name: "type",
      title: "Vehicle Type",
      type: "reference",
      to: [{ type: "vehicleType" }],
      description: "Type under category from Sanity.",
    }),
    defineField({
      name: "vehicleSegment",
      title: "Vehicle Segment",
      type: "string",
      options: {
        list: [
          { title: "Car", value: "car" },
          { title: "Truck", value: "truck" },
        ],
        layout: "radio",
      },
      initialValue: "car",
      description:
        "Top-level segment used by UI tabs to separate cars and trucks.",
    }),
    defineField({
      name: "isOnSale",
      title: "On Sale",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "isNewEnergy",
      title: "New Energy",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "features",
      title: "Features",
      type: "array",
      of: [{ type: "string" }],
      options: {
        layout: "tags",
      },
    }),
    defineField({
      name: "scrapedAt",
      title: "Scraped At (UTC date)",
      type: "string",
      description:
        "ISO date (YYYY-MM-DD) of the scraper run that last updated this vehicle.",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "sku",
      media: "images.0",
    },
  },
});
