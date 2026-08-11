"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Quarter = {
  slug: string;
  name: string;
  thai?: string;
  center: [number, number];
  zoom: number;
  tagline?: string;
};

type Props = {
  quarters: Quarter[];
  initialQuarter?: string;
};

const HERITAGE_MAP_BASE = "/atlas/historic-core?embed=1";

function heritageMapUrlFor(q: Quarter | null): string {
  if (!q) return HERITAGE_MAP_BASE;
  return `${HERITAGE_MAP_BASE}&at=${q.center[0]},${q.center[1]},${q.zoom}`;
}

export function HomepageClient({ quarters, initialQuarter }: Props) {
  const [activeSlug, setActiveSlug] = useState<string | null>(initialQuarter ?? null);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activeQuarter = activeSlug ? quarters.find((q) => q.slug === activeSlug) : null;
  const initialSrc = heritageMapUrlFor(activeQuarter ?? null);

  // Reload BKK's own embedded heritage map at the selected quarter.
  function pickQuarter(q: Quarter) {
    if (q.slug === activeSlug) return;
    setActiveSlug(q.slug);
    setIframeKey((k) => k + 1);
  }

  return (
    <div className="atlas-shell">
      <header className="atlas-shell-masthead" aria-label="BKKx primary">
        <Link className="register-wordmark" href="/" aria-label="BKKx home">
          <span>BKK</span>
          <b>x</b>
        </Link>
        <div className="atlas-shell-masthead-meta">
          <span className="register-eyebrow">
            <span lang="th">กรุงเทพมหานคร · Bangkok</span>
          </span>
          <strong>Bangkok&apos;s heritage, block by block.</strong>
          <small>
            The 3D map is the front door. Nine quarters, seven walks, 571
            registered monuments — pick a quarter and fly there.
          </small>
        </div>
        <nav className="atlas-shell-nav" aria-label="Heritage navigation">
          <Link href="/heritage#register">Register</Link>
          <Link href="/heritage#walks">Walks</Link>
        </nav>
      </header>

      <div className="atlas-shell-body">
        <aside className="atlas-shell-quarters" aria-label="Heritage quarters">
          <p className="register-eyebrow">Quarters</p>
          <h2 className="register-section-title atlas-shell-quarters-title">
            Nine quarters of the old city
          </h2>
          <p className="atlas-shell-quarters-lede">
            From the royal island to the green lung. Click a quarter to fly
            the map there. Each one is a hand-curated page with its
            monuments, its walks and its own history.
          </p>
          <ol className="atlas-shell-quarter-chips">
            {quarters.map((q) => {
              const isActive = q.slug === activeSlug;
              return (
                <li key={q.slug}>
                  <button
                    type="button"
                    className={isActive ? "is-active" : ""}
                    onClick={() => pickQuarter(q)}
                    aria-pressed={isActive}
                  >
                    <span className="atlas-shell-quarter-name">
                      {q.name}
                      {q.thai ? (
                        <small lang="th"> {q.thai}</small>
                      ) : null}
                    </span>
                    {q.tagline ? (
                      <span className="atlas-shell-quarter-tag">{q.tagline}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>

          <p className="register-eyebrow atlas-shell-quarters-after">Source</p>
          <p className="atlas-shell-side">
            <a href="https://github.com/Nonarkara/BKKxCulture" target="_blank" rel="noreferrer">
              Source on GitHub
            </a>
          </p>

          <p className="atlas-shell-footnote">
            This heritage 3D view is one of two BKKx systems — the operational
            city twin lives separately at{" "}
            <a href="https://atlas.nonarkara.org" target="_blank" rel="noreferrer">
              atlas.nonarkara.org
            </a>
            . Data here: OpenStreetMap (ODbL), Fine Arts Department register
            and BMA planning context. See{" "}
            <Link href="/heritage#register">the register</Link> for source
            notes.
          </p>
        </aside>

        <div className="atlas-shell-map">
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={initialSrc}
            title="Bangkok 3D atlas — heritage view"
            loading="eager"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
