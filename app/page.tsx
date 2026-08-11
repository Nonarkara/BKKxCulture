import type { Metadata } from "next";
import { AREAS } from "./data/heritage-content";
import { HomepageClient } from "./heritage-atlas/HomepageClient";

// The new BKKx front door (added 2026-08-11).
//
// Old philosophy: the heritage register is the homepage; the 3D map is
// a secondary link in the nav, gated by a per-district world picker.
// The user's actual flow (audited from the Fable 5 incident) was:
// land on the register, hunt for the 3D map in the nav, click through
// to a district page, get confused about which district to choose.
//
// New philosophy: the 3D map IS the homepage. The nine heritage
// quarters are quick-jump chips in a side panel that fly the map to
// a precise center+zoom (atlas now accepts ?at=lng,lat,zoom for
// external fly-to, added 2026-08-11). The two Minecraft worlds are
// side offers in the masthead, not a section. The drill-down pages
// (/areas/[slug], /walks/[slug], /heritage, /worlds) keep the
// Editorial register content for the curious — but the front door
// is the map.
//
// Metadata lives here (not in the client component) so Next.js
// picks it up for SSR/SEO. The iframe is rendered client-side
// because the quarter click changes the iframe's src.
export const metadata: Metadata = {
  title: "Bangkok's heritage, block by block",
  description:
    "An open 3D atlas of Bangkok's heritage: nine quarters from the royal island to Bang Krachao, 571 registered ancient monuments, and seven documented walks — the culture half of the BKKx pair, alongside the operational city twin at atlas.nonarkara.org.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Bangkok's heritage, block by block · BKKxC(ulture)",
    description:
      "9 quarters, 7 walks, 571 registered monuments. The 3D map is the front door.",
    url: "https://bkk.nonarkara.org",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "BKKxC(ulture) — Bangkok's heritage, block by block",
  alternateName: "BKKx",
  url: "https://bkk.nonarkara.org",
  description:
    "The heritage-focused 3D atlas of Bangkok: 9 quarters, 7 walks, 571 registered monuments — the sibling system to Bangkok's operational digital twin at atlas.nonarkara.org.",
  creator: { "@type": "Person", name: "Non Arkara", url: "https://nonarkara.org" },
};

export default function Home() {
  const quarters = AREAS.map((a) => ({
    slug: a.slug,
    name: a.name,
    thai: a.thai,
    tagline: a.tagline,
    center: a.center,
    zoom: a.zoom,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomepageClient quarters={quarters} />
    </>
  );
}
