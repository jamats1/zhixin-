import { defineField, defineType } from "sanity";

/**
 * BD Spares (and similar) “shop by line” node: brand → model line (e.g. C-Class, Q5).
 * Distinct from `vehicleType` (cars vs SUVs taxonomy) so passenger spare-part browsing can mirror the supplier site.
 */
export default defineType({
  name: "sparePartLine",
  title: "Spare part line (shop by model)",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Display name, e.g. C-Class, Q5",
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
      title: "Vehicle brand",
      type: "reference",
      to: [{ type: "brand" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "path",
      title: "Source path",
      type: "string",
      description: "Path segments on bdspares, e.g. mercedes-benz/c-class",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "sourceUrl",
      title: "Listing URL (first page)",
      type: "url",
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: "title",
      brandTitle: "brand.title",
      path: "path",
    },
    prepare({ title, brandTitle, path }) {
      return {
        title: title ?? "Line",
        subtitle: [brandTitle, path].filter(Boolean).join(" · "),
      };
    },
  },
});
