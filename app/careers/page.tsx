import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Join Us | Zhixin车",
  description: "Careers and opportunities at Zhixin车.",
};

const WHATSAPP_URL = "https://wa.me/8618157977478";

export default function CareersPage() {
  return (
    <InfoPageShell title="Join Us">
      <p>
        We are always interested in motivated people in content, operations, and
        customer support. If you would like to explore opportunities, introduce
        yourself on WhatsApp with a short note about your background.
      </p>
      <p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] font-medium hover:underline"
        >
          Message us on WhatsApp
        </a>
      </p>
    </InfoPageShell>
  );
}
