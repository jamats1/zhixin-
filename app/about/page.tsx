import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "About Us | Zhixin车",
  description: "About Zhixin车 — vehicle reference and sourcing information.",
};

export default function AboutPage() {
  return (
    <InfoPageShell title="About Us">
      <p>
        Zhixin车 provides vehicle styles, specifications, and reference
        information to help you research models available in the Chinese market.
      </p>
      <p>
        Visuals and colors on this site are for reference only; please confirm
        details with the manufacturer or your dealer before purchasing.
      </p>
    </InfoPageShell>
  );
}
