"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { REPOSITORY, worlds, type World } from "./walkthrough-data";

export type { Stop, World, WorldId } from "./walkthrough-data";
export { worlds, REPOSITORY, RELEASE_BASE } from "./walkthrough-data";

function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}

export function BangkokWalkthrough() {
  const [worldId, setWorldId] = useState<World["id"]>("ratchathewi");
  const [stopId, setStopId] = useState(worlds[0].stops[0].id);
  const [visits, setVisits] = useState<number | null>(null);

  const world = useMemo(
    () => worlds.find((item) => item.id === worldId) ?? worlds[0],
    [worldId],
  );
  const stop =
    world.stops.find((item) => item.id === stopId) ?? world.stops[0];

  useEffect(() => {
    fetch("/api/pageview", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
    fetch("/api/stats")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const stats = data as { total?: unknown } | null;
        if (typeof stats?.total === "number") setVisits(stats.total);
      })
      .catch(() => {});
  }, []);

  function chooseWorld(nextWorld: World) {
    setWorldId(nextWorld.id);
    setStopId(nextWorld.stops[0].id);
  }

  return (
    <main>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="BKKxC(ulture) home">
          <span>BKK</span><b>x</b><em>C(ulture)</em>
        </Link>
        <nav aria-label="Primary navigation">
          <Link href="/">Heritage register</Link>
          <a href="#atlas">The worlds</a>
          <Link href="/atlas/ratchathewi">3D atlas</Link>
          <a href="#enter">Download</a>
          <a href={REPOSITORY} target="_blank" rel="noreferrer">
            GitHub <ArrowIcon />
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">
            Digital Bangkok <span /> Minecraft Java
          </p>
          <h1>
            Bangkok,
            <br />
            <em>block by block.</em>
          </h1>
          <p className="hero-lede">
            <span lang="th">กรุงเทพฯ ทีละบล็อก</span> — an open, playable city atlas. Follow the
            streets, cross the river, then step inside the map.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#atlas">
              Start walking <span aria-hidden="true">↓</span>
            </a>
            <a
              className="button button-quiet"
              href={REPOSITORY}
              target="_blank"
              rel="noreferrer"
            >
              View the source <ArrowIcon />
            </a>
          </div>
        </div>

        <div className="hero-map" aria-label="Minecraft overview of Ratchathewi">
          <Image
            src="/images/ratchathewi.png"
            alt="Top-down Minecraft map of Ratchathewi, Bangkok"
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 900px) 92vw, 52vw"
          />
          <div className="map-scanline" />
          <p className="map-coordinate map-coordinate-top">13.7743° N</p>
          <p className="map-coordinate map-coordinate-bottom">100.5649° E</p>
          <div className="hero-map-label">
            <span>WORLD 01</span>
            <strong>RATCHATHEWI</strong>
          </div>
        </div>

        <div className="hero-index">
          <span>01</span>
          <p>Two worlds online<br />Bangkok keeps growing</p>
        </div>
      </section>

      <section className="signal-strip" aria-label="Project statistics">
        <div><strong>02</strong><span>Worlds online</span></div>
        <div><strong>111</strong><span>Region files</span></div>
        <div><strong>111,616</strong><span>Validated chunks</span></div>
        <div><strong>1:1</strong><span>Block-to-metre scale</span></div>
        <div><strong>{visits === null ? "LIVE" : visits.toLocaleString()}</strong><span>{visits === null ? "Open atlas" : "Atlas visits"}</span></div>
      </section>

      <section className="atlas-section" id="atlas">
        <div className="section-heading">
          <p className="eyebrow">Field atlas / <span lang="th">สมุดภาคสนาม</span></p>
          <h2>Pick a district.<br />Follow the signals.</h2>
          <p>
            Each marker is a chapter. Read the city from above, then download
            the same terrain and walk it at one-block scale.
          </p>
        </div>

        <div className="world-switcher" role="tablist" aria-label="Choose a world">
          {worlds.map((item) => (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={item.id === world.id}
              aria-controls={`panel-${item.id}`}
              className={item.id === world.id ? "is-active" : ""}
              onClick={() => chooseWorld(item)}
            >
              <span>{item.number}</span>
              <strong>{item.name}</strong>
              <small lang="th">{item.thai}</small>
            </button>
          ))}
        </div>

        <article
          className="world-intro"
          id={`panel-${world.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${world.id}`}
        >
          <div>
            <p className="world-number">WORLD {world.number}</p>
            <h3>{world.strapline}</h3>
          </div>
          <p>{world.description}</p>
          <dl>
            <div><dt>Coverage</dt><dd>{world.distance}</dd></div>
            <div><dt>Regions</dt><dd>{world.regions}</dd></div>
            <div><dt>Chunks</dt><dd>{world.chunks}</dd></div>
          </dl>
        </article>

        <div className={`map-explorer map-${world.id}`}>
          <div
            className="explorer-canvas"
            style={{ aspectRatio: `${world.width} / ${world.height}` }}
          >
            <Image
              key={world.image}
              src={world.image}
              alt={`Top-down Minecraft map of ${world.name}, Bangkok`}
              fill
              sizes="(max-width: 1000px) 100vw, 68vw"
            />
            <div className="map-shade" />
            {world.stops.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`hotspot ${item.id === stop.id ? "is-active" : ""}`}
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
                aria-label={`Open chapter ${index + 1}: ${item.name}`}
                aria-pressed={item.id === stop.id}
                onClick={() => setStopId(item.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>
            ))}
            <p className="map-north"><span>↑</span> N</p>
          </div>

          <aside className="chapter-panel" aria-live="polite">
            <div className="chapter-count">
              <span>{String(world.stops.indexOf(stop) + 1).padStart(2, "0")}</span>
              <small>/ {String(world.stops.length).padStart(2, "0")}</small>
            </div>
            <p className="chapter-kicker">{stop.chapter}</p>
            <h3>{stop.name}</h3>
            <p className="chapter-thai" lang="th">{stop.thai}</p>
            <p className="chapter-description">{stop.description}</p>
            <div className="field-note">
              <span>FIELD NOTE</span>
              <p>{stop.signal}</p>
            </div>
            <p className="coordinates">{stop.coordinates}</p>
            <div className="chapter-nav" aria-label="Walkthrough chapters">
              {world.stops.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={item.id === stop.id ? "is-active" : ""}
                  onClick={() => setStopId(item.id)}
                  aria-label={`Chapter ${index + 1}: ${item.name}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="enter-section" id="enter">
        <div className="enter-heading">
          <p className="eyebrow">From browser to blocks</p>
          <h2>Enter Bangkok.</h2>
          <p>Three steps. No mods. The city is ready when Minecraft is.</p>
        </div>
        <ol className="steps">
          <li>
            <span>01</span>
            <div><h3>Choose a world</h3><p>Start with transit-heavy Ratchathewi or cross the river through the historic core.</p></div>
          </li>
          <li>
            <span>02</span>
            <div><h3>Download and unzip</h3><p>Place the world folder inside your Minecraft Java <code>saves</code> directory.</p></div>
          </li>
          <li>
            <span>03</span>
            <div><h3>Walk, fly, build</h3><p>Open Minecraft Java 1.21.4+, choose Singleplayer, and enter in Creative mode.</p></div>
          </li>
        </ol>

        <div className="download-grid">
          {worlds.map((item) => (
            <div key={item.id} className="download-card">
              <span className="download-number">{item.number}</span>
              <div>
                <small>Two ways in</small>
                <h3>{item.name}</h3>
                <p>{item.thai} · {item.distance}</p>
              </div>
              <div className="download-actions">
                <a
                  className="download-action download-action-primary"
                  href={`/atlas/${item.id}`}
                >
                  <span>Walk in 3D</span>
                  <small>Browser · no install</small>
                </a>
                <a
                  className="download-action download-action-quiet"
                  href={item.download}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Download world</span>
                  <small>Minecraft Java 1.21.4+</small>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pipeline-section">
        <div>
          <p className="eyebrow">Built in public</p>
          <h2>A city model should never be a black box.</h2>
        </div>
        <div className="pipeline" aria-label="Data pipeline">
          <span>OPEN MAP DATA</span><b>→</b><span>ARNIS</span><b>→</b><span>MINECRAFT</span><b>→</b><span>YOU</span>
        </div>
        <p>
          Streets, buildings, water and vegetation come from open geographic
          data, translated into blocks by Arnis, then checked region by region.
          The code, world manifests and future roadmap remain open on GitHub.
        </p>
        <a className="text-link" href={REPOSITORY} target="_blank" rel="noreferrer">
          Explore the repository <ArrowIcon />
        </a>
      </section>

      <section className="next-section">
        <p>THE ATLAS IS OPEN</p>
        <h2>Bangkok is bigger than two worlds.</h2>
        <p>
          This is the foundation: a district-by-district walkthrough designed
          to grow into live city layers, community stories and collaborative builds.
        </p>
        <a href={`${REPOSITORY}/issues`} target="_blank" rel="noreferrer">
          Suggest the next district <ArrowIcon />
        </a>
      </section>

      <footer>
        <a className="wordmark footer-wordmark" href="#top"><span>BKK</span><b>x</b><em>C(ulture)</em></a>
        <p>Bangkok, block by block.<br /><span lang="th">กรุงเทพฯ ทีละบล็อก</span></p>
        <div>
          <a href={REPOSITORY} target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://github.com/louis-e/arnis" target="_blank" rel="noreferrer">Arnis</a>
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
        </div>
        <small>© 2026 Non Arkara · Open city, open source.</small>
      </footer>
    </main>
  );
}
