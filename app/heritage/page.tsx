import type { Metadata } from "next";
import Link from "next/link";
import { HeritageExplorer } from "../HeritageExplorer";
import { PlaceMasthead } from "../PlaceMasthead";
import { AREAS, WALKS, photoFor, walkDistance } from "../data/heritage-content";

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
    title: "Bangkok's heritage register · BKKx",
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
          <h1>
            Bangkok&apos;s heritage,
            <br />
            monument by monument.
          </h1>
          <div className="register-intro">
            <p>
              The Fine Arts Department keeps a register of Thailand&apos;s ancient
              monuments — the temples, forts, bridges, canals and shophouse rows
              the state has judged worth protecting. Five hundred and seventy-one
              of them are in Bangkok. This register holds all of them, along with
              the quarters they cluster in and the walks that string them
              together.
            </p>
            <p>
              A monument is either <b>gazetted</b> — formally registered in the
              Royal Gazette, with a volume and a date — or still{" "}
              <b>awaiting consideration</b>. Both are here, and the difference is
              marked, because a building waiting on a decision is the one most
              likely to be gone before the decision arrives.
            </p>
            <p>
              The 3D map is the <Link href="/">front door of BKKx</Link> now —
              this register is the drill-down. If you want to read the city
              from above first, the map is on the home page. If you want to
              read it register-first, you&apos;re in the right place.
            </p>
          </div>

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

        <section className="register-quarters" id="quarters" aria-label="Heritage quarters">
          <h2 className="register-section-title">The quarters</h2>
          <p className="register-section-lede">
            Heritage in Bangkok is not scattered evenly — it pools in quarters, each
            with its own founding story. Nine of them, from the royal island to the
            green lung, each with its monuments, its walks and its own page.
          </p>
          <ul className="quarters-index">
            {AREAS.map((area) => (
              <li key={area.slug}>
                <Link href={`/areas/${area.slug}`}>
                  <span className="quarters-name">
                    {area.name} <small lang="th">{area.thai}</small>
                  </span>
                  <span className="quarters-tag">{area.tagline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="register-walks-index" id="walks" aria-label="Heritage walks">
          <h2 className="register-section-title">The walks</h2>
          <p className="register-section-lede">
            Seven routes, seven different ways of moving through the city&apos;s
            heritage — sacred sites, trading lanes, the royal axis, a market
            morning, a green loop by bicycle. Every line is a real
            street-following route; every stop is a documented place.
          </p>
          <ol className="walks-index">
            {WALKS.map((walk) => (
              <li key={walk.slug}>
                <Link href={`/walks/${walk.slug}`}>
                  <span className="walks-pattern">{walk.pattern}</span>
                  <span className="walks-name">{walk.name}</span>
                  <span className="walks-meta">
                    {walk.stops.length} stops
                    {walkDistance(walk) ? ` · ${walkDistance(walk)}` : ""}
                    {walk.mode === "bike" ? " · by bicycle" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section id="register" aria-label="The register, mapped">
          <div className="register-lede register-section-head">
            <h2 className="register-section-title">The register, mapped</h2>
            <p className="register-section-lede">
              Every monument with a position precise enough to draw. Filled marks
              are gazetted; hollow marks await consideration. Pick one for its
              history, its Royal Gazette entry, and — inside a generated world —
              the block to stand on.
            </p>
          </div>
          <HeritageExplorer />
        </section>
      </div>
    </>
  );
}
