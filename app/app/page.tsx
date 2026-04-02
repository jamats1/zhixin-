import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "App Client | Zhixin车",
  description: "Zhixin车 web experience — use your browser on any device.",
};

export default function AppClientPage() {
  return (
    <InfoPageShell title="App Client">
      <p>
        Zhixin车 runs as a fast, responsive web application. Add this site to
        your home screen on iOS or Android for an app-like experience—no
        separate install required.
      </p>
      <p>
        Use the search bar and filters on the homepage to browse vehicles and
        specifications on desktop or mobile.
      </p>
    </InfoPageShell>
  );
}
