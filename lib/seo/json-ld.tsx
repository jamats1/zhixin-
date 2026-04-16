import {
  SITE_BRAND,
  SITE_DESCRIPTION,
  SITE_KNOWS_ABOUT,
} from "@/lib/seo/site-identity";

function stripJsonLdContext(node: Record<string, unknown>) {
  const { "@context": _drop, ...rest } = node;
  return rest;
}

/** Single JSON-LD script (@graph when multiple nodes) for crawlers. */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const payload = Array.isArray(data) ? data : [data];
  const doc =
    payload.length === 1
      ? payload[0]
      : {
          "@context": "https://schema.org",
          "@graph": payload.map(stripJsonLdContext),
        };
  const html = JSON.stringify(doc).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // JSON-LD requires a script tag; payload is server-built schema.org objects only.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required for JSON-LD
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function organizationJsonLd(siteUrl: string, name: string = SITE_BRAND) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    areaServed: [
      { "@type": "AdministrativeArea", name: "Worldwide" },
      { "@type": "Country", name: "China" },
    ],
    knowsAbout: [...SITE_KNOWS_ABOUT],
  };
}

export function websiteJsonLd(siteUrl: string, name: string = SITE_BRAND) {
  const searchTemplate = `${siteUrl.replace(/\/$/, "")}/search?q={search_term_string}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: siteUrl,
    description: SITE_DESCRIPTION,
    publisher: { "@type": "Organization", name, url: siteUrl },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: searchTemplate,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
