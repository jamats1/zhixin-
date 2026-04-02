"use client";

import { getSiteWhatsAppDigits } from "@/lib/site-whatsapp";

type Props = {
  listingTitle: string;
  productPath: string;
  isCarPart?: boolean;
  className?: string;
};

function openWhatsAppListingInquiry(opts: {
  phoneDigits: string;
  listingTitle: string;
  productPath: string;
  isCarPart: boolean;
}) {
  if (!opts.phoneDigits || typeof window === "undefined") return;
  const listingUrl = `${window.location.origin}${opts.productPath}`;
  const lead = opts.isCarPart
    ? "Hi, I'm interested in this car part:"
    : "Hi, I'd like to inquire about pricing for:";
  const message = `${lead}

${opts.listingTitle}

Product page: ${listingUrl}

Please reply when you can. Thank you!`;
  const url = `https://wa.me/${opts.phoneDigits}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function ProductInquiryCTA({
  listingTitle,
  productPath,
  isCarPart = false,
  className = "",
}: Props) {
  const whatsappDigits = getSiteWhatsAppDigits();

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <span className="flex-1 min-w-0">
        <button
          type="button"
          className="w-full py-4 px-4 bg-[var(--primary)] text-white rounded-xl font-bold text-lg hover:bg-[var(--primary-hover)] transition-colors min-h-[48px]"
          aria-label="WhatsApp Me about this listing"
          onClick={() =>
            openWhatsAppListingInquiry({
              phoneDigits: whatsappDigits,
              listingTitle,
              productPath,
              isCarPart,
            })
          }
        >
          WhatsApp Me
        </button>
      </span>
    </div>
  );
}
