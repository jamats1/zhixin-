import { defineField, defineType } from "sanity";

export default defineType({
  name: "brand",
  title: "Brand",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Brand name (must match vehicle.brand when filtering)",
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
      name: "logo",
      title: "Logo",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "thumbnail",
      title: "Thumbnail",
      type: "image",
      description: "Listing/card thumbnail. Logo is the main brand image.",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "isHot",
      title: "Hot Brand",
      type: "boolean",
      description:
        "Whether this brand should appear under the Hot tab (e.g. matching AutoCango popular list).",
      initialValue: false,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 0,
      description: "Lower numbers appear first (e.g. in Popular Brands)",
    }),
  ],
  orderings: [
    {
      title: "Order Asc",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
    {
      title: "Title A–Z",
      name: "titleAsc",
      by: [{ field: "title", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      media: "logo",
    },
  },
});
