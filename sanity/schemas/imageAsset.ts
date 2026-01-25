import { defineType } from "sanity";

export default defineType({
  name: "imageAsset",
  title: "Image Asset",
  type: "image",
  options: {
    hotspot: true,
  },
  fields: [
    {
      name: "alt",
      title: "Alt Text",
      type: "string",
    },
    {
      name: "caption",
      title: "Caption",
      type: "string",
    },
  ],
});
