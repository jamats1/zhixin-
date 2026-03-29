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

export function organizationJsonLd(siteUrl: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: siteUrl,
  };
}

export function websiteJsonLd(siteUrl: string, name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: siteUrl,
    publisher: { "@type": "Organization", name, url: siteUrl },
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
