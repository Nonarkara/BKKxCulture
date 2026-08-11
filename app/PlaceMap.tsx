"use client";

import { useEffect, useRef } from "react";
import type maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Light editorial map for area and walk pages. Same ground and accent as the
// register explorer; this one is static content — markers and an optional
// route line — so it takes props instead of fetching the register.

const STYLE = "https://tiles.openfreemap.org/styles/positron";
const MAP_FONT = ["Noto Sans Regular"]; // the only stack OpenFreeMap serves
const SEAL = "#8c2f23";
const INK = "#14140f";
const PAPER = "#f4f2ec";
const GEOMETRY_URL = "/heritage-walk-geometry.json";

export type Marker = {
  lat: number;
  lon: number;
  label: string;      // shown beside the point
  n?: number;         // stop number for walks
  muted?: boolean;    // awaiting-consideration monuments
};

type Props = {
  center: [number, number];
  zoom: number;
  markers: Marker[];
  routeSlug?: string; // fetch this walk's line from the geometry file
  fit?: boolean;      // fit bounds to markers instead of center/zoom
};

export function PlaceMap({ center, zoom, markers, routeSlug, fit }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let map: maplibregl.Map | null = null;
    let observer: ResizeObserver | null = null;

    void (async () => {
      const maplibre = (await import("maplibre-gl")).default;
      if (disposed || !containerRef.current) return;

      map = new maplibre.Map({
        container: containerRef.current,
        style: STYLE,
        center,
        zoom,
        minZoom: 10,
        renderWorldCopies: false,
        attributionControl: false,
        antialias: true,
      });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-right");

      map.on("load", async () => {
        if (!map) return;

        if (routeSlug) {
          try {
            const res = await fetch(GEOMETRY_URL);
            const geom = (await res.json()) as Record<string, { line: [number, number][] }>;
            const line = geom[routeSlug]?.line;
            if (line && map) {
              map.addSource("route", {
                type: "geojson",
                data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } },
              });
              map.addLayer({
                id: "route-casing",
                type: "line",
                source: "route",
                paint: { "line-color": PAPER, "line-width": 6, "line-opacity": 0.9 },
              });
              map.addLayer({
                id: "route-line",
                type: "line",
                source: "route",
                paint: { "line-color": SEAL, "line-width": 2.5 },
              });
            }
          } catch {
            // No line is an acceptable state; the stops still render and the
            // page's distance figure comes from the build, not this fetch.
          }
        }

        map.addSource("marks", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: markers.map((m, i) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [m.lon, m.lat] },
              properties: {
                label: m.label,
                n: m.n ?? null,
                muted: m.muted ? 1 : 0,
                order: i,
              },
            })),
          },
        });

        map.addLayer({
          id: "marks-dot",
          type: "circle",
          source: "marks",
          paint: {
            "circle-radius": markers.some((m) => m.n) ? 10 : 5.5,
            "circle-color": ["case", ["==", ["get", "muted"], 1], PAPER, SEAL],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": ["case", ["==", ["get", "muted"], 1], INK, PAPER],
          },
        });

        if (markers.some((m) => m.n)) {
          map.addLayer({
            id: "marks-number",
            type: "symbol",
            source: "marks",
            layout: {
              "text-field": ["to-string", ["get", "n"]],
              "text-font": MAP_FONT,
              "text-size": 11,
              "text-allow-overlap": true,
            },
            paint: { "text-color": PAPER },
          });
        }

        map.addLayer({
          id: "marks-label",
          type: "symbol",
          source: "marks",
          minzoom: 13,
          layout: {
            "text-field": ["get", "label"],
            "text-font": MAP_FONT,
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-max-width": 9,
          },
          paint: {
            "text-color": INK,
            "text-halo-color": PAPER,
            "text-halo-width": 1.6,
          },
        });

        if (fit && markers.length > 1) {
          const lons = markers.map((m) => m.lon);
          const lats = markers.map((m) => m.lat);
          map.fitBounds(
            [
              [Math.min(...lons), Math.min(...lats)],
              [Math.max(...lons), Math.max(...lats)],
            ],
            { padding: 56, duration: 0, maxZoom: 16 },
          );
        }
      });

      // Flex/grid child: real size lands after MapLibre measures.
      observer = new ResizeObserver(() => map?.resize());
      observer.observe(containerRef.current);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
    };
    // Static content per page — mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="register-canvas-frame place-map">
      <div ref={containerRef} className="register-canvas" />
    </div>
  );
}
