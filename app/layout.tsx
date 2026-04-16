import type { Metadata } from "next";
import "./globals.css";
import { SITE_BRAND, SITE_DESCRIPTION } from "@/lib/seo/site-identity";
import { getSiteUrl } from "@/lib/seo/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_BRAND} — Cars, Trucks & Auto Parts from China`,
    template: `%s | ${SITE_BRAND}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "China auto parts",
    "car export China",
    "truck parts wholesale",
    "commercial vehicles China",
    "OEM parts China",
    "aftermarket parts export",
    SITE_BRAND,
  ],
  alternates: {
    canonical: "/",
    languages: {
      "x-default": siteUrl,
      en: siteUrl,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: SITE_BRAND,
    title: `${SITE_BRAND} — Global auto & parts from China`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_BRAND} — Cars, trucks & parts from China`,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
