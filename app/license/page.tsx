import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Business License | Zhixin车",
  description: "Business license and legal information for Zhixin车.",
};

export default function LicensePage() {
  return (
    <InfoPageShell title="Business License">
      <p>
        Official business registration and license details can be provided upon
        request for partners and suppliers. For a copy of registration
        documents, contact us through the channels listed on our Contact page.
      </p>
    </InfoPageShell>
  );
}
