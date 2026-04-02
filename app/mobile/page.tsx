import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Mobile Web | Zhixin车",
  description: "Zhixin车 on mobile — same site, optimized layouts.",
};

export default function MobileWebPage() {
  return (
    <InfoPageShell title="Mobile Web">
      <p>
        This site is built for mobile browsers: tap the menu and filters from
        the home page to explore vehicles on a small screen.
      </p>
      <p>
        There is no separate “mobile-only” URL—you are already on the mobile web
        version when you visit us from your phone.
      </p>
    </InfoPageShell>
  );
}
