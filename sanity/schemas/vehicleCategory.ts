import { defineField, defineType } from "sanity";

export default defineType({
  name: "vehicleCategory",
  title: "Vehicle Category",
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
      name: "icon",
      title: "Icon",
      type: "image",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "appliesToSegments",
      title: "Applies to segments",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Vehicles (car)", value: "car" },
          { title: "Trucks (truck)", value: "truck" },
        ],
        layout: "grid",
      },
      description:
        "Which catalog tab lists this category. Leave empty for Vehicles (passenger) only. Add Trucks for the Trucks tab. Choose both values only when the category should appear under both tabs.",
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "icon",
    },
  },
});
