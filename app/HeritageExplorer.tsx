"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Positron: the light counterpart to the atlas's dark base. The register is a
// reading surface, not an operations console, and it takes the opposite ground.
const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/positron";

// The only stack OpenFreeMap serves, and it carries the Thai block. Leaving
// text-font unset makes MapLibre ask for a default it does not have, and every
// label renders blank.
const MAP_FONT = ["Noto Sans Regular"];

// Bangkok only. Below this the base tiles start repeating the world.
const MIN_ZOOM = 10;

const REGISTER_URL = "/heritage-register.json";

// Editorial palette. One accent — gazetted monuments carry it, everything
// awaiting a decision is ink at reduced weight. Absence of the accent is the
// information, which is why a second hue is not needed.
const SEAL = "#8c2f23";
const MUTED_INK = "#8a8578";
const PAPER = "#f4f2ec";

type Block = { x: number; z: number };

type Site = {
  id: string;
  name: string;
  district: string;
  subDistrict: string;
  road: string;
  registered: boolean;
  registerStatus: string;
  precision: "building" | "district";
  locatedBy: string;
  lat?: number;
  lon?: number;
  world?: string;
  block?: Block;
  gazette?: { volume: string; part: string; date: string; topic: string } | null;
  history?: string;
  artCulture?: string;
  present?: string;
  blurb?: string;
  blurbTruncated?: boolean;
};

type World = {
  title: string;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  blocks: { maxX: number; maxZ: number };
  spawnY: number | null;
  siteCount: number;
};

type Register = {
  source: {
    name: string;
    nameEn: string;
    dataset: string;
    licence: string;
    coordinateNote: string;
    osmAttribution: string;
    retrieved?: string;
  };
  worlds: Record<string, World>;
  counts: {
    total: number;
    registered: number;
    awaiting: number;
    buildingPrecision: number;
    districtPrecision: number;
    walkable: number;
    byWorld: Record<string, number>;
  };
  sites: Site[];
};

type Filter = "all" | "registered" | "walkable";

const FILTERS: { id: Filter; label: string; hint: string }[] = [
  { id: "all", label: "Every located monument", hint: "Everything with a building-precision position" },
  { id: "registered", label: "Gazetted only", hint: "Formally registered in the Royal Gazette" },
  { id: "walkable", label: "Walkable in Minecraft", hint: "Inside a generated BKKx world" },
];

function matches(site: Site, filter: Filter): boolean {
  if (filter === "walkable") return Boolean(site.block);
  if (filter === "registered") return site.registered;
  return true;
}

function teleport(site: Site, world: World | undefined): string | null {
  if (!site.block) return null;
  const y = world?.spawnY ?? -50;
  return `/tp @s ${site.block.x} ${y} ${site.block.z}`;
}

function locationNote(site: Site): string {
  if (site.locatedBy === "fine-arts") {
    return "Coordinate as published by the Fine Arts Department.";
  }
  const method = site.locatedBy.split(":").pop();
  return `The published coordinate was too coarse to plot; located by matching the monument name against OpenStreetMap (${method}).`;
}

export function HeritageExplorer() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [register, setRegister] = useState<Register | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [styleReady, setStyleReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(REGISTER_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`register ${res.status}`);
        return res.json() as Promise<Register>;
      })
      .then((data) => {
        if (!cancelled) setRegister(data);
      })
      .catch((err: unknown) => {
        // A blank map with no explanation is the one outcome worth avoiding.
        if (!cancelled) setError(err instanceof Error ? err.message : "load failed");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const located = useMemo(
    () => (register ? register.sites.filter((s) => s.precision === "building") : []),
    [register],
  );

  const visible = useMemo(() => located.filter((s) => matches(s, filter)), [located, filter]);

  const selected = useMemo(
    () => (selectedId ? located.find((s) => s.id === selectedId) ?? null : null),
    [located, selectedId],
  );

  const selectedWorld = selected?.world ? register?.worlds[selected.world] : undefined;
  const tp = selected ? teleport(selected, selectedWorld) : null;

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: visible.map((s) => ({
        type: "Feature" as const,
        id: s.id,
        geometry: { type: "Point" as const, coordinates: [s.lon as number, s.lat as number] },
        properties: {
          id: s.id,
          name: s.name,
          registered: s.registered ? 1 : 0,
          walkable: s.block ? 1 : 0,
        },
      })),
    }),
    [visible],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let disposed = false;
    let map: maplibregl.Map | null = null;
    let observer: ResizeObserver | null = null;

    void (async () => {
      const maplibre = (await import("maplibre-gl")).default;
      if (disposed || !containerRef.current) return;

      map = new maplibre.Map({
        container: containerRef.current,
        style: OPENFREEMAP_LIGHT_STYLE,
        center: [100.4977, 13.7546],
        zoom: 12.6,
        minZoom: MIN_ZOOM,
        renderWorldCopies: false,
        attributionControl: false,
        antialias: true,
      });
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");

      map.on("load", () => {
        if (!map) return;
        map.addSource("heritage", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: "heritage-halo",
          type: "circle",
          source: "heritage",
          filter: ["==", ["get", "walkable"], 1],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 7, 16, 18],
            "circle-color": SEAL,
            "circle-opacity": 0.1,
          },
        });

        map.addLayer({
          id: "heritage-dot",
          type: "circle",
          source: "heritage",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 11, 3.5, 16, 8],
            "circle-color": ["case", ["==", ["get", "registered"], 1], SEAL, MUTED_INK],
            "circle-stroke-width": 1,
            "circle-stroke-color": PAPER,
          },
        });

        map.addLayer({
          id: "heritage-label",
          type: "symbol",
          source: "heritage",
          minzoom: 14,
          layout: {
            "text-field": ["get", "name"],
            "text-font": MAP_FONT,
            "text-size": 11,
            "text-offset": [0, 1.1],
            "text-anchor": "top",
            "text-max-width": 9,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#14140f",
            "text-halo-color": PAPER,
            "text-halo-width": 1.6,
          },
        });

        const pick = (event: maplibregl.MapLayerMouseEvent) => {
          const id = event.features?.[0]?.properties?.id;
          if (typeof id === "string") {
            setSelectedId(id);
            setCopied(false);
          }
        };
        map.on("click", "heritage-dot", pick);
        map.on("mouseenter", "heritage-dot", () => {
          if (map) map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "heritage-dot", () => {
          if (map) map.getCanvas().style.cursor = "";
        });

        setStyleReady(true);
      });

      // The container is a flex/grid child, so its real size lands after
      // MapLibre has measured. Without this the canvas stays frozen at its
      // pre-layout size and the map renders into a sliver.
      observer = new ResizeObserver(() => map?.resize());
      observer.observe(containerRef.current);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
      setStyleReady(false);
    };
  }, []);

  // Gated on styleReady rather than map.once("load"): the register usually
  // arrives before the style finishes, and a once("load") registered after
  // load has already fired never runs.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const source = map.getSource("heritage") as maplibregl.GeoJSONSource | undefined;
    source?.setData(geojson);
  }, [geojson, styleReady]);

  const focus = useCallback((site: Site) => {
    setSelectedId(site.id);
    setCopied(false);
    const map = mapRef.current;
    if (map && site.lon !== undefined && site.lat !== undefined) {
      map.flyTo({
        center: [site.lon, site.lat],
        zoom: Math.max(map.getZoom(), 15.5),
        duration: 900,
      });
    }
  }, []);

  const copyTeleport = useCallback(async () => {
    if (!tp) return;
    try {
      await navigator.clipboard.writeText(tp);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [tp]);

  const counts = register?.counts;

  return (
    <section className="register-explorer" aria-label="Heritage register">
      {counts ? (
        <dl className="register-tally">
          <div>
            <dt>Monuments in the register</dt>
            <dd>{counts.total}</dd>
          </div>
          <div>
            <dt>Gazetted</dt>
            <dd>{counts.registered}</dd>
          </div>
          <div>
            <dt>Awaiting consideration</dt>
            <dd>{counts.awaiting}</dd>
          </div>
          <div>
            <dt>Walkable in Minecraft</dt>
            <dd>{counts.walkable}</dd>
          </div>
        </dl>
      ) : null}

      <div className="register-canvas-frame">
        <div ref={containerRef} className="register-canvas" />
        {error ? (
          <p className="register-state is-error" role="alert">
            The register did not load ({error}). The map is empty for that reason,
            not because Bangkok has no monuments. Reload, or read the source data
            directly at data.go.th.
          </p>
        ) : null}
        {!register && !error ? (
          <p className="register-state">Reading the register…</p>
        ) : null}
      </div>

      <p className="register-caption">
        {counts
          ? `${counts.buildingPrecision} monuments plotted to a building. ${counts.districtPrecision} more are in the register with no position precise enough to draw, and are deliberately not shown on the map.`
          : "Registered ancient monuments of Bangkok."}
      </p>

      <div className="register-body">
        <div className="register-index">
          <div className="register-filters" role="group" aria-label="Filter monuments">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                title={f.hint}
                aria-pressed={filter === f.id}
                className={filter === f.id ? "is-active" : undefined}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="register-showing">
            Showing <b>{visible.length}</b>
            {visible.length > 200 ? " — first 200 listed; the map holds them all" : null}
          </p>

          <ol className="register-list">
            {visible.slice(0, 200).map((site) => (
              <li key={site.id} className={selectedId === site.id ? "is-selected" : undefined}>
                <button type="button" onClick={() => focus(site)}>
                  <span
                    className={site.registered ? "seal is-gazetted" : "seal is-awaiting"}
                    aria-hidden="true"
                  />
                  <span className="register-list-name" lang="th">
                    {site.name}
                  </span>
                  <span className="register-list-meta">
                    <span lang="th">{site.district}</span>
                    {site.block ? ` · block ${site.block.x}, ${site.block.z}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <aside className="register-detail" aria-live="polite">
          {selected ? (
            <>
              <p className="register-eyebrow" lang="th">
                {selected.district}
                {selected.subDistrict ? ` · ${selected.subDistrict}` : ""}
              </p>
              <h2 lang="th">{selected.name}</h2>

              <dl className="register-facts">
                <dt>Status</dt>
                <dd className={selected.registered ? "is-gazetted" : "is-awaiting"} lang="th">
                  {selected.registerStatus}
                </dd>
                {selected.gazette ? (
                  <>
                    <dt>Royal Gazette</dt>
                    <dd>
                      Vol {selected.gazette.volume}
                      {selected.gazette.part ? `, part ${selected.gazette.part}` : ""}
                      {selected.gazette.date ? ` · ${selected.gazette.date}` : ""}
                    </dd>
                  </>
                ) : null}
                <dt>Position</dt>
                <dd>
                  {selected.lat?.toFixed(5)}, {selected.lon?.toFixed(5)}
                  <small>{locationNote(selected)}</small>
                </dd>
              </dl>

              {tp && selectedWorld ? (
                <div className="register-walk">
                  <h3>
                    Walk here — <span>{selectedWorld.title}</span>
                  </h3>
                  <code>{tp}</code>
                  <button type="button" onClick={copyTeleport}>
                    {copied ? "Copied" : "Copy command"}
                  </button>
                  <small>
                    Block {selected.block?.x}, {selected.block?.z}. One block is one
                    metre. Paste in chat with cheats on, or walk from spawn.
                  </small>
                </div>
              ) : (
                <p className="register-outside">
                  Outside both generated worlds. Mapped here, but there is no
                  Minecraft ground to stand on yet.
                </p>
              )}

              {selected.history ? (
                <section className="register-prose">
                  <h3 lang="th">ประวัติ</h3>
                  <p lang="th">{selected.history}</p>
                </section>
              ) : null}
              {selected.artCulture ? (
                <section className="register-prose">
                  <h3 lang="th">ลักษณะทางศิลปกรรม</h3>
                  <p lang="th">{selected.artCulture}</p>
                </section>
              ) : null}
              {selected.present ? (
                <section className="register-prose">
                  <h3 lang="th">สภาพปัจจุบัน</h3>
                  <p lang="th">{selected.present}</p>
                </section>
              ) : null}
              {!selected.history && selected.blurb ? (
                <section className="register-prose">
                  <h3 lang="th">ประวัติ</h3>
                  <p lang="th">
                    {selected.blurb}
                    {selected.blurbTruncated ? "…" : ""}
                  </p>
                  {selected.blurbTruncated && register ? (
                    <a href={register.source.dataset} target="_blank" rel="noreferrer">
                      Read the full entry in the Fine Arts register
                    </a>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : (
            <div className="register-detail-empty">
              <h2>Pick a monument.</h2>
              <p>
                Choose one from the index, or a point on the map, to read what the
                register records: its status, the Royal Gazette entry that
                protects it, its history, and — where BKKx has built that part of
                the city — the block to stand on.
              </p>
            </div>
          )}
        </aside>
      </div>

      {register ? (
        <footer className="register-provenance">
          <h3>Where this comes from</h3>
          <p>
            <a href={register.source.dataset} target="_blank" rel="noreferrer">
              <span lang="th">{register.source.name}</span>
            </a>{" "}
            — {register.source.nameEn}. {register.source.licence}.{" "}
            {register.source.osmAttribution}.
            {register.source.retrieved ? ` Retrieved ${register.source.retrieved}.` : null}
          </p>
          <p>{register.source.coordinateNote}</p>
          <p>
            The Ministry of Culture&apos;s better-known{" "}
            <span lang="th">สถาปัตยกรรมสำคัญ</span> dataset covers 72 provinces
            and contains no Bangkok records at all, which is why this register is
            built from the Fine Arts Department&apos;s instead.
          </p>
        </footer>
      ) : null}
    </section>
  );
}
