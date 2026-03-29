import { defineField, defineType } from "sanity";

export default defineType({
  name: "carPart",
  title: "Car Part",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Part Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "partNumber",
      title: "Part Number",
      type: "string",
      description: "Manufacturer part number or SKU",
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description:
        "Aligned with ChinaTrucks parts sections (engine, transmission, axle, tire, retarder, other-parts).",
      options: {
        list: [
          { title: "Engine", value: "engine" },
          { title: "Transmission", value: "transmission" },
          { title: "Axle", value: "axle" },
          { title: "Tire", value: "tire" },
          { title: "Retarder", value: "retarder" },
          { title: "Other parts", value: "other" },
          { title: "Lighting (retail)", value: "lighting" },
          { title: "Body / panels (retail)", value: "body-panel" },
          { title: "Glass (retail)", value: "glass" },
          { title: "Filters (retail)", value: "filter" },
          { title: "Wheels (retail)", value: "wheel" },
          { title: "Accessories (retail)", value: "accessory" },
          { title: "Other retail", value: "other-retail" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "brand",
      title: "Brand",
      type: "string",
      description: "Part manufacturer or brand",
    }),
    defineField({
      name: "compatibleVehicles",
      title: "Compatible Vehicles",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "brand",
              title: "Vehicle Brand",
              type: "string",
            },
            {
              name: "model",
              title: "Vehicle Model",
              type: "string",
            },
            {
              name: "yearRange",
              title: "Year Range",
              type: "object",
              fields: [
                {
                  name: "from",
                  title: "From Year",
                  type: "number",
                },
                {
                  name: "to",
                  title: "To Year",
                  type: "number",
                },
              ],
            },
          ],
        },
      ],
    }),
    defineField({
      name: "gallery",
      title: "Image Gallery",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "image",
              title: "Image",
              type: "image",
              options: {
                hotspot: true,
              },
              validation: (Rule) => Rule.required(),
            },
            {
              name: "alt",
              title: "Alt Text",
              type: "string",
            },
          ],
          preview: {
            select: {
              title: "alt",
              media: "image",
            },
          },
        },
      ],
    }),
    defineField({
      name: "priceRange",
      title: "Price Range",
      type: "object",
      fields: [
        {
          name: "min",
          title: "Minimum Price",
          type: "number",
        },
        {
          name: "max",
          title: "Maximum Price",
          type: "number",
        },
        {
          name: "currency",
          title: "Currency",
          type: "string",
          initialValue: "USD",
        },
      ],
    }),
    defineField({
      name: "specifications",
      title: "Specifications",
      type: "object",
      fields: [
        {
          name: "material",
          title: "Material",
          type: "string",
        },
        {
          name: "dimensions",
          title: "Dimensions",
          type: "string",
        },
        {
          name: "weight",
          title: "Weight (kg)",
          type: "number",
        },
        {
          name: "warranty",
          title: "Warranty (months)",
          type: "number",
        },
      ],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "isOnSale",
      title: "On Sale",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "inStock",
      title: "In Stock",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "sparePartLine",
      title: "Spare part line",
      type: "reference",
      to: [{ type: "sparePartLine" }],
      description:
        "Model line for passenger spare-part browsing (e.g. BD Spares C-Class).",
    }),
    defineField({
      name: "sourceVendor",
      title: "Source vendor",
      type: "string",
      description: "e.g. bdspares",
    }),
    defineField({
      name: "sourceUrl",
      title: "Source product URL",
      type: "url",
    }),
    defineField({
      name: "sourceSku",
      title: "Source SKU",
      type: "string",
    }),
    defineField({
      name: "alternatePartNumbers",
      title: "Alternate part numbers",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "priceZar",
      title: "Price (ZAR)",
      type: "number",
      description:
        "Original list price in South African rand before conversion.",
    }),
    defineField({
      name: "exchangeRateZarUsd",
      title: "ZAR→USD rate used",
      type: "number",
      description: "Multiplier applied at ingest (1 ZAR = rate USD).",
    }),
    defineField({
      name: "woocommerceCategory",
      title: "WooCommerce category label",
      type: "string",
      description: "Raw category name from the supplier (e.g. Headlight).",
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: (doc) => `${doc.name}-${doc.partNumber || ""}`,
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      name: "name",
      partNumber: "partNumber",
      category: "category",
      media: "gallery.0.image",
    },
    prepare({ name, partNumber, category, media }) {
      return {
        title: name,
        subtitle: partNumber
          ? `${category || "Part"} - ${partNumber}`
          : category || "Part",
        media,
      };
    },
  },
  orderings: [
    {
      title: "Name A–Z",
      name: "nameAsc",
      by: [{ field: "name", direction: "asc" }],
    },
    {
      title: "Category",
      name: "categoryAsc",
      by: [{ field: "category", direction: "asc" }],
    },
    {
      title: "Published, New",
      name: "publishedDesc",
      by: [{ field: "publishedAt", direction: "desc" }],
    },
  ],
});
