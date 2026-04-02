import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Contact Us | Zhixin车",
  description: "Contact Zhixin车 via WhatsApp.",
};

const WHATSAPP_URL = "https://wa.me/8618157977478";

export default function ContactPage() {
  return (
    <InfoPageShell title="Contact Us">
      <p>
        For questions about vehicles, parts, or working with us, reach us on
        WhatsApp and we will respond as soon as we can.
      </p>
      <p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] font-medium hover:underline"
        >
          Open WhatsApp chat
        </a>
      </p>
    </InfoPageShell>
  );
}
