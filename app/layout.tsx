import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getSiteUrl } from "@/lib/seo/site-url";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Zhixin — Vehicles & spare parts",
    template: "%s | Zhixin",
  },
  description:
    "Browse vehicle series, trucks, and spare parts. Photos, specifications, and WhatsApp inquiry — export-focused inventory.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Zhixin",
    title: "Zhixin — Vehicles & spare parts",
    description:
      "Browse vehicle series, trucks, and spare parts. Photos, specifications, and WhatsApp inquiry.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zhixin — Vehicles & spare parts",
    description:
      "Browse vehicle series, trucks, and spare parts. Photos, specifications, and WhatsApp inquiry.",
  },
  robots: { index: true, follow: true },
  referrer: "origin-when-cross-origin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.variable} antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
