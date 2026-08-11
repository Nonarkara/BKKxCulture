import type { Metadata } from "next";
import { BangkokWalkthrough } from "../walkthrough";

export const metadata: Metadata = {
  title: "The Minecraft worlds",
  description:
    "Walk Bangkok as a playable Minecraft city atlas, from Ratchathewi's transit spine to the historic Chao Phraya riverfront.",
  alternates: { canonical: "/worlds" },
  openGraph: {
    title: "The Minecraft worlds · BKKx",
    description:
      "Two Bangkok districts generated block by block from open geographic data.",
    url: "/worlds",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "BKKx",
  alternateName: "Bangkok, block by block",
  url: "https://bkk.nonarkara.org",
  description:
    "An open, playable city atlas that turns Bangkok into Minecraft worlds.",
  creator: {
    "@type": "Person",
    name: "Non Arkara",
    url: "https://nonarkara.org",
  },
};

export default function WorldsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <BangkokWalkthrough />
    </>
  );
}
