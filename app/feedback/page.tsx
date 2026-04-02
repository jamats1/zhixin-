import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Feedback | Zhixin车",
  description: "Send feedback about Zhixin车.",
};

const WHATSAPP_URL = "https://wa.me/8618157977478";

export default function FeedbackPage() {
  return (
    <InfoPageShell title="Feedback">
      <p>
        Spotted incorrect specs, a broken image, or something confusing? Tell us
        on WhatsApp with the vehicle or page you were viewing so we can fix it.
      </p>
      <p>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] font-medium hover:underline"
        >
          Send feedback via WhatsApp
        </a>
      </p>
    </InfoPageShell>
  );
}
