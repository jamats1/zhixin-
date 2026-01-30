import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "fhp2b1rf";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
// Optional: required for private datasets or when Studio shows content but API returns empty.
// Prefer a read-only token for client use (NEXT_PUBLIC_ is exposed in the browser).
const token =
  process.env.NEXT_PUBLIC_SANITY_READ_TOKEN ||
  process.env.NEXT_PUBLIC_SANITY_API_TOKEN ||
  undefined;

// Only create client if projectId is available.
// perspective: "published" ensures anonymous reads see published content (default "raw" with apiVersion 2024-01-01 can hide it).
const client = projectId
  ? createClient({
      projectId,
      dataset,
      useCdn: process.env.NODE_ENV === "production",
      apiVersion: "2024-01-01",
      perspective: "published",
      ...(token ? { token } : {}),
    })
  : null;

const builder = client ? createImageUrlBuilder(client) : null;

export function urlFor(source: SanityImageSource) {
  if (!builder) {
    console.warn(
      "Sanity client not configured. Please set NEXT_PUBLIC_SANITY_PROJECT_ID",
    );
    // Return a mock object that matches the expected interface
    const mockBuilder = {
      url: () => "",
      width: () => mockBuilder,
      height: () => mockBuilder,
      fit: () => mockBuilder,
    };
    return mockBuilder as any;
  }
  return builder.image(source);
}

/** Returns brand logo URL or null when client not configured or no logo. Use for next/image. */
export function brandLogoUrl(
  logo: SanityImageSource | null | undefined,
  size = 64,
): string | null {
  if (!builder || !logo) return null;
  try {
    return builder.image(logo).width(size).height(size).fit("max").url();
  } catch (error) {
    console.error("Error generating brand logo URL:", error);
    return null;
  }
}

export default client;
