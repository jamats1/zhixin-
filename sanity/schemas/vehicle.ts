import { defineField, defineType } from "sanity";

export default defineType({
  name: "vehicle",
  title: "Vehicle",
  type: "document",
  fields: [
    defineField({
      name: "brand",
      title: "Brand",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "model",
      title: "Model",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "number",
      validation: (Rule) => Rule.required().min(1900).max(2100),
    }),
    defineField({
      name: "type",
      title: "Vehicle Type",
      type: "reference",
      to: [{ type: "vehicleType" }],
      validation: (Rule) => Rule.required(),
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
            {
              name: "imageType",
              title: "Image Type",
              type: "string",
              options: {
                list: [
                  { title: "Exterior", value: "exterior" },
                  { title: "Interior", value: "interior" },
                  { title: "Engine", value: "engine" },
                  { title: "Detail", value: "detail" },
                ],
              },
              initialValue: "exterior",
            },
          ],
          preview: {
            select: {
              title: "alt",
              media: "image",
              subtitle: "imageType",
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
      name: "specs",
      title: "Specifications",
      type: "object",
      fields: [
        {
          name: "engine",
          title: "Engine",
          type: "string",
        },
        {
          name: "power",
          title: "Power (HP)",
          type: "number",
        },
        {
          name: "transmission",
          title: "Transmission",
          type: "string",
        },
        {
          name: "drivetrain",
          title: "Drivetrain",
          type: "string",
        },
        {
          name: "fuelType",
          title: "Fuel Type",
          type: "string",
        },
      ],
    }),
    defineField({
      name: "isOnSale",
      title: "On Sale",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "isNewEnergy",
      title: "New Energy Vehicle",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: (doc) => `${doc.brand}-${doc.model}-${doc.year}`,
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
      brand: "brand",
      model: "model",
      year: "year",
      media: "gallery.0.image",
    },
    prepare({ brand, model, year, media }) {
      return {
        title: `${brand} ${model}`,
        subtitle: year?.toString(),
        media,
      };
    },
  },
  orderings: [
    {
      title: "Year, New",
      name: "yearDesc",
      by: [{ field: "year", direction: "desc" }],
    },
    {
      title: "Year, Old",
      name: "yearAsc",
      by: [{ field: "year", direction: "asc" }],
    },
  ],
});
