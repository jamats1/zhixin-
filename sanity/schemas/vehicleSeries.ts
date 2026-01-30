import { defineField, defineType } from "sanity";

/**
 * Matches Autohome listing: series name (English only), thumbnail, images gallery,
 * price range, and Autohome metadata. No Chinese fields—scraper translates before ingest.
 */
export default defineType({
  name: "vehicleSeries",
  title: "Vehicle Series (Autohome)",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Series name in English (translated from Autohome).",
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
      name: "tagline",
      title: "Tagline",
      type: "string",
      description: "Short English marketing line (OpenAI-generated).",
    }),
    defineField({
      name: "thumbnail",
      title: "Thumbnail",
      type: "image",
      description: "Listing/card thumbnail from Autohome.",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              title: "Alt Text",
              type: "string",
            },
          ],
        },
      ],
      description: "Additional images (e.g. from series gallery page).",
    }),
    defineField({
      name: "priceRange",
      title: "Price Range",
      type: "object",
      fields: [
        {
          name: "min",
          title: "Minimum (CNY)",
          type: "number",
        },
        {
          name: "max",
          title: "Maximum (CNY)",
          type: "number",
        },
        {
          name: "raw",
          title: "Raw Text",
          type: "string",
          description: "e.g. 暂无报价",
        },
      ],
    }),
    defineField({
      name: "autohomeUrl",
      title: "Autohome URL",
      type: "url",
    }),
    defineField({
      name: "autohomeId",
      title: "Autohome Series ID",
      type: "string",
    }),
    defineField({
      name: "isOnSale",
      title: "On Sale",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "isNewEnergy",
      title: "New Energy",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "category",
      title: "Vehicle Category",
      type: "reference",
      to: [{ type: "vehicleCategory" }],
      description: "Category (e.g. Cars, SUVs) from Sanity.",
    }),
    defineField({
      name: "type",
      title: "Vehicle Type",
      type: "reference",
      to: [{ type: "vehicleType" }],
      description: "Type under category from Sanity.",
    }),
    defineField({
      name: "brand",
      title: "Brand",
      type: "reference",
      to: [{ type: "brand" }],
      description: "Brand from Sanity (for filtering and counts).",
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "thumbnail",
    },
  },
});
