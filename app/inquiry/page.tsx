import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Inquiry | Zhixin车",
  description: "Submit an inquiry to Zhixin车.",
};

const WHATSAPP_URL = "https://wa.me/8618157977478";

export default function InquiryPage() {
  return (
    <InfoPageShell title="Inquiry">
      <p>
        Share what you are looking for—vehicle model, quantity, destination, or
        budget—and we will follow up on WhatsApp.
      </p>
      <p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center min-h-[44px] px-5 py-2 bg-[var(--primary)] text-white rounded-md text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          Start on WhatsApp
        </a>
      </p>
    </InfoPageShell>
  );
}
