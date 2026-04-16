import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";
import { SITE_BRAND } from "@/lib/seo/site-identity";
import { absoluteUrl } from "@/lib/seo/site-url";

const faqs = [
  {
    question: `What is ${SITE_BRAND}?`,
    answer: `${SITE_BRAND} lists passenger vehicles, commercial trucks, and auto parts sourced from the Chinese market for international buyers and researchers.`,
  },
  {
    question: "Do you ship vehicles and parts internationally?",
    answer:
      "Inventory and export terms vary by listing. Use contact or inquiry flows on the site to discuss shipping, compliance, and pricing for your region.",
  },
  {
    question: "Are images and specifications guaranteed?",
    answer:
      "Content is for reference. Always confirm year, trim, VIN-related details, and part compatibility with the supplier before purchase.",
  },
  {
    question: "How do I search for a part or vehicle?",
    answer:
      "Use the search bar and filters by brand, model, and keywords. Product and vehicle detail pages include specifications where available.",
  },
] as const;

export const metadata: Metadata = {
  title: `FAQ | ${SITE_BRAND}`,
  description:
    "Frequently asked questions about vehicles, trucks, auto parts, and exporting from China.",
  alternates: { canonical: absoluteUrl("/faq") },
  openGraph: {
    title: `FAQ | ${SITE_BRAND}`,
    description:
      "Answers about vehicles, parts, and sourcing from China on Zhixin.",
    url: absoluteUrl("/faq"),
    siteName: SITE_BRAND,
    type: "website",
  },
};

export default function FAQPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD only
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <InfoPageShell title="Frequently asked questions">
        <div className="space-y-8">
          {faqs.map((faq) => (
            <section key={faq.question}>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                {faq.question}
              </h2>
              <p>{faq.answer}</p>
            </section>
          ))}
        </div>
      </InfoPageShell>
    </>
  );
}
