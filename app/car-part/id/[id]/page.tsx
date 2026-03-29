import { notFound, permanentRedirect } from "next/navigation";
import { fetchCarPartSlugById } from "@/lib/sanity/product-detail";

export default async function CarPartIdRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slug = await fetchCarPartSlugById(id);
  if (!slug) {
    notFound();
  }
  permanentRedirect(`/car-part/${slug}`);
}
