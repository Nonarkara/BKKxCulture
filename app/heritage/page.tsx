import type { Metadata } from "next";
import { HeritageExplorer } from "../HeritageExplorer";
import { PlaceMasthead } from "../PlaceMasthead";
import { RegisterLede } from "./RegisterLede";
import { QuartersIndex, WalksIndex, RegisterMappedHeading } from "./RegisterIndexes";
import { AREAS, WALKS, photoFor } from "../data/heritage-content";

// The heritage register was the BKKx homepage until 2026-08-11, when the
// 3D map took the front door. The Editorial register content — the
// Fine Arts Department register, the nine quarters, the seven walks —
// kept its content; it just moved to /heritage. Anyone who saved
// /heritage during the redirect-stub era (and the /heritage that
// permanentlyRedirected to /) now lands here. The masthead is the
// same masthead the old homepage used, so the Editorial register
// aesthetic is preserved.

export const metadata: Metadata = {
  title: "Bangkok's heritage register",
  description:
    "The Fine Arts Department register of Thailand's ancient monuments, all 571 in Bangkok, mapped honestly with the quarters they cluster in and the walks that string them together.",
  alternates: { canonical: "/heritage" },
  openGraph: {
    title: "Bangkok's heritage register · BKKxC(ulture)",
    description:
      "571 registered monuments, nine heritage quarters, seven walks — the editorial register behind the heritage atlas.",
    url: "https://bkk.nonarkara.org/heritage",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Bangkok heritage register — BKKx",
  description:
    "Fine Arts Department registered ancient monument positions for Bangkok, relocated to building precision where the published coordinate is too coarse, with heritage quarters and documented walking routes.",
  license: "https://creativecommons.org/licenses/by/4.0/",
  isBasedOn: "https://data.go.th/dataset/gis-finearts",
  url: "https://bkk.nonarkara.org",
  creator: { "@type": "Person", name: "Non Arkara", url: "https://nonarkara.org" },
};

export default function HeritageRegister() {
  const hero = photoFor("hero");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="register">
        <PlaceMasthead />

        <article className="register-lede">
          <p className="register-eyebrow">
            <span lang="th">มรดกวัฒนธรรมกรุงเทพมหานคร</span>
          </p>
          <RegisterLede />

          {hero ? (
            <figure className="register-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={hero.file}
                alt="Wat Arun across the Chao Phraya at sunset"
                loading="eager"
              />
              <figcaption>
                Wat Arun Ratchawararam across the Chao Phraya — register monument,
                gazetted 1949. Photo: {hero.artist} ·{" "}
                <a href={hero.descriptionUrl} target="_blank" rel="noreferrer">
                  Wikimedia Commons
                </a>{" "}
                · {hero.licence}.
              </figcaption>
            </figure>
          ) : null}
        </article>

        <QuartersIndex areas={AREAS} />
        <WalksIndex walks={WALKS} />

        <section id="register" aria-label="The register, mapped">
          <RegisterMappedHeading />
          <HeritageExplorer />
        </section>
      </div>
    </>
  );
}
