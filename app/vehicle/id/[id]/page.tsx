import { notFound, permanentRedirect } from "next/navigation";
import { fetchVehicleSlugById } from "@/lib/sanity/product-detail";

export default async function VehicleIdRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slug = await fetchVehicleSlugById(id);
  if (!slug) {
    notFound();
  }
  permanentRedirect(`/vehicle/${slug}`);
}
