"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Stop, World } from "../../walkthrough-data";
import {
  FINEARTS_HERITAGE_SITES,
  FINEARTS_HERITAGE_SOURCE,
  type HeritageSite,
} from "../../data/heritage-finearts";
import {
  BKK_URBAN_ZONING_GEOJSON,
  BKK_URBAN_ZONING_NOTE,
} from "../../data/zoning-planning";

type Props = {
  world: World;
  embedded?: boolean;
  initialView?: { center: LngLat; zoom: number };
};

type LngLat = [number, number];

const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const BUILDING_SOURCE_CANDIDATES = ["openfreemap", "openmaptiles"];

// Real Bangkok over the OpenFreeMap dark base. Esri World Imagery is free
// for non-commercial use; attribution is wired in below.
const ESRI_IMAGERY_TILES = [
  "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
];
const ESRI_IMAGERY_ATTRIBUTION =
  "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const BKKX_BUILDING_PAINT: maplibregl.FillExtrusionLayerSpecification["paint"] = {
  "fill-extrusion-color": "#c9ff38",
  "fill-extrusion-height": [
    "coalesce",
    ["get", "render_height"],
    ["get", "height"],
    0,
  ] as unknown as number,
  "fill-extrusion-base": [
    "coalesce",
    ["get", "render_min_height"],
    ["get", "min_height"],
    0,
  ] as unknown as number,
  // Slightly translucent so the satellite imagery shows through walls and
  // gaps. The BKKx signature stays in the building silhouettes.
  "fill-extrusion-opacity": 0.7,
  "fill-extrusion-vertical-gradient": true,
};

const ROAD_TIER_FILTERS: Record<string, maplibregl.ExpressionSpecification> = {
  motorway: ["==", "class", "motorway"],
  major: ["in", "class", "trunk", "primary", "secondary"] as unknown as maplibregl.ExpressionSpecification,
  minor: ["in", "class", "tertiary", "minor", "service"] as unknown as maplibregl.ExpressionSpecification,
};

function roadLineWidth(base: number, top: number): maplibregl.ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    10,
    base,
    18,
    top,
  ];
}

function parseCoordinates(value: string): LngLat | null {
  const match = value.match(
    /(-?\d+(?:\.\d+)?)\s*°\s*([NS])\s*·\s*(-?\d+(?:\.\d+)?)\s*°\s*([EW])/i,
  );
  if (!match) return null;
  const [, latRaw, latHemi, lngRaw, lngHemi] = match;
  const lat = Number(latRaw) * (latHemi.toUpperCase() === "S" ? -1 : 1);
  const lng = Number(lngRaw) * (lngHemi.toUpperCase() === "W" ? -1 : 1);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lng, lat];
}

function districtCenter(stops: Stop[]): LngLat {
  const coords = stops
    .map((stop) => parseCoordinates(stop.coordinates))
    .filter((value): value is LngLat => value !== null);
  if (coords.length === 0) return [100.5018, 13.7567];
  const lng = coords.reduce((sum, [x]) => sum + x, 0) / coords.length;
  const lat = coords.reduce((sum, [, y]) => sum + y, 0) / coords.length;
  return [lng, lat];
}

const PROJECTIONS: Record<string, {
  minMcX: number; maxMcX: number;
  minMcZ: number; maxMcZ: number;
  minGeoLat: number; maxGeoLat: number;
  minGeoLon: number; maxGeoLon: number;
}> = {
  "ratchathewi": {
    minMcX: 0, maxMcX: 4955,
    minMcZ: 0, maxMcZ: 2944,
    minGeoLat: 13.7478553, maxGeoLat: 13.7743399,
    minGeoLon: 100.5190372, maxGeoLon: 100.5649221
  },
  "historic-core": {
    minMcX: 0, maxMcX: 3383,
    minMcZ: 0, maxMcZ: 3216,
    minGeoLat: 13.737134, maxGeoLat: 13.766063,
    minGeoLon: 100.478897, maxGeoLon: 100.510225
  }
};

function getAmbientLight(timeMode: string) {
  switch (timeMode) {
    case "sunrise":
      return { color: "#ffd8b3", intensity: 0.8, position: [1.5, 45, 30] };
    case "noon":
      return { color: "#ffffff", intensity: 0.6, position: [1.1, 90, 80] };
    case "sunset":
      return { color: "#ffb3cc", intensity: 0.8, position: [1.5, 225, 25] };
    case "night":
      return { color: "#4a5bb3", intensity: 0.2, position: [1.5, 180, 85] };
    case "realtime":
default: {
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 8) return { color: "#ffd8b3", intensity: 0.8, position: [1.5, 45, 30] };
      if (hour >= 8 && hour < 16) return { color: "#ffffff", intensity: 0.6, position: [1.1, 90, 80] };
      if (hour >= 16 && hour < 19) return { color: "#ffb3cc", intensity: 0.8, position: [1.5, 225, 25] };
      return { color: "#4a5bb3", intensity: 0.2, position: [1.5, 180, 85] };
    }
  }
}

function getStylesForConfig(timeMode: string, weatherMode: string) {
  let effTime = timeMode;
  if (timeMode === "realtime") {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 8) effTime = "sunrise";
    else if (hour >= 8 && hour < 16) effTime = "noon";
    else if (hour >= 16 && hour < 19) effTime = "sunset";
    else effTime = "night";
  }

  let satOpacity = 0.78;
  let satBrightness = 0.96;
  let satSaturation = -0.45;
  let satContrast = 0.08;

  let buildingColor = "#c9ff38";
  let buildingOpacity = 0.7;

  let motorwayColor = "#c9ff38";
  let majorRoadColor = "#5e6157";
  let minorRoadColor = "#2c2d28";

  if (effTime === "sunrise") {
    satOpacity = 0.65;
    satBrightness = 0.85;
    satSaturation = -0.2;
    satContrast = 0.15;
    buildingColor = "#ff9d42";
    motorwayColor = "#ff7e3b";
  } else if (effTime === "sunset") {
    satOpacity = 0.55;
    satBrightness = 0.75;
    satSaturation = -0.1;
    satContrast = 0.2;
    buildingColor = "#ff4b72";
    motorwayColor = "#ff386c";
  } else if (effTime === "night") {
    satOpacity = 0.22;
    satBrightness = 0.38;
    satSaturation = -0.75;
    satContrast = 0.3;
    buildingColor = "#00ffd8";
    buildingOpacity = 0.85;
    motorwayColor = "#e1ff00";
    majorRoadColor = "#2a2d36";
    minorRoadColor = "#121317";
  }

  if (weatherMode === "rainy") {
    satOpacity = Math.max(0.15, satOpacity * 0.7);
    satBrightness = Math.max(0.2, satBrightness * 0.65);
    satSaturation = Math.min(-0.8, satSaturation - 0.2);
    if (effTime !== "night") {
      buildingColor = "#8ca391";
    }
  } else if (weatherMode === "hazepm25") {
    satOpacity = Math.max(0.2, satOpacity * 0.8);
    satBrightness = Math.max(0.3, satBrightness * 0.85);
    satSaturation = -0.9;
  }

  return {
    satOpacity,
    satBrightness,
    satSaturation,
    satContrast,
    buildingColor,
    buildingOpacity,
    motorwayColor,
    majorRoadColor,
    minorRoadColor
  };
}

interface OpenMeteoAQIResponse {
  current?: {
    pm2_5?: number;
  };
}

export function AtlasView({ world, embedded = false, initialView }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);
  const hasHistoricContext = world.id === "historic-core";
  const [activeStopId, setActiveStopId] = useState<string>(world.stops[0].id);
  const [mapReady, setMapReady] = useState(false);

  // Atmosphere Engine States
  const [timeMode, setTimeMode] = useState<"realtime" | "sunrise" | "noon" | "sunset" | "night">("realtime");
  const [weatherMode, setWeatherMode] = useState<"clear" | "rainy" | "hazepm25">("clear");
  const [pm25, setPm25] = useState<number | null>(null);

  // Cinematic Tour States
  const [isTourPlaying, setIsTourPlaying] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const tourTimerRef = useRef<NodeJS.Timeout | null>(null);

  // GIS Layer & Heritage Inspection States
  const [showHeritage, setShowHeritage] = useState(true);
  const [showZoning, setShowZoning] = useState(true);
  const [selectedHeritage, setSelectedHeritage] = useState<HeritageSite | null>(null);
  const heritageMarkerRefs = useRef<maplibregl.Marker[]>([]);

  // Command Copy State
  const [copied, setCopied] = useState(false);

  // Derived state to avoid synchronous state update in effect body
  const activeStopIdToUse = isTourPlaying ? (world.stops[tourIndex]?.id ?? activeStopId) : activeStopId;

  const activeStop = useMemo(
    () => world.stops.find((stop) => stop.id === activeStopIdToUse) ?? world.stops[0],
    [activeStopIdToUse, world.stops],
  );

  // Refs to store latest tour state for persistent event listeners
  const tourIndexRef = useRef(tourIndex);
  const isTourPlayingRef = useRef(isTourPlaying);

  useEffect(() => {
    tourIndexRef.current = tourIndex;
    isTourPlayingRef.current = isTourPlaying;
  }, [tourIndex, isTourPlaying]);

  // Live AQI Fetch
  useEffect(() => {
    fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=13.7563&longitude=100.5018&current=pm2_5")
      .then((res) => (res.ok ? (res.json() as Promise<OpenMeteoAQIResponse>) : null))
      .then((data) => {
        const val = data?.current?.pm2_5;
        if (typeof val === "number") setPm25(Math.round(val));
      })
      .catch((err) => console.warn("bkkx: pm25 fetch failed", err));
  }, []);

  const pm25Status = useMemo(() => {
    if (pm25 === null) return { text: "fetching...", color: "#a4a69b" };
    if (pm25 <= 12) return { text: `${pm25} µg/m³ (Good)`, color: "#3bfd00" };
    if (pm25 <= 35) return { text: `${pm25} µg/m³ (Moderate)`, color: "#fdf800" };
    if (pm25 <= 55) return { text: `${pm25} µg/m³ (Sensitive-Unhealthy)`, color: "#fd9f00" };
    return { text: `${pm25} µg/m³ (Unhealthy)`, color: "#fd3300" };
  }, [pm25]);

  // Compute Minecraft TP coordinates
  const mcCoords = useMemo(() => {
    const proj = PROJECTIONS[world.id];
    if (!proj) return null;
    const coord = parseCoordinates(activeStop.coordinates);
    if (!coord) return null;
    const [lng, lat] = coord;
    const mcX = Math.round(((lng - proj.minGeoLon) / (proj.maxGeoLon - proj.minGeoLon)) * (proj.maxMcX - proj.minMcX) + proj.minMcX);
    const mcZ = Math.round(((proj.maxGeoLat - lat) / (proj.maxGeoLat - proj.minGeoLat)) * (proj.maxMcZ - proj.minMcZ) + proj.minMcZ);
    return { x: mcX, z: mcZ };
  }, [activeStop, world.id]);

  const copyTpCommand = () => {
    if (!mcCoords) return;
    const cmd = `/tp ${mcCoords.x} 72 ${mcCoords.z}`;
    navigator.clipboard.writeText(cmd)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => console.error("Could not copy command", err));
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let active = true;
    let mapInstance: maplibregl.Map | null = null;
    let resizeObserverInstance: ResizeObserver | null = null;

    import("maplibre-gl").then((MapLibreModule) => {
      if (!active) return;
      const maplibregl = MapLibreModule.default;

      const map = new maplibregl.Map({
        container: containerRef.current!,
        style: OPENFREEMAP_DARK_STYLE,
        center: initialView?.center ?? districtCenter(world.stops),
        zoom: initialView?.zoom ?? 15.4,
        pitch: 60,
        bearing: -20,
        maxPitch: 75,
        minZoom: 11,
        maxZoom: 19,
        hash: false,
        attributionControl: { compact: true },
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
        "top-right",
      );
      map.addControl(
        new maplibregl.ScaleControl({ unit: "metric", maxWidth: 120 }),
        "bottom-left",
      );

      // Pause tour on map manipulation
      const handleMapInteract = () => {
        if (isTourPlayingRef.current) {
          setIsTourPlaying(false);
          setActiveStopId(world.stops[tourIndexRef.current]?.id ?? world.stops[0].id);
        }
      };

      map.on("dragstart", handleMapInteract);
      map.on("zoomstart", handleMapInteract);
      map.on("pitchstart", handleMapInteract);
      map.on("rotatestart", handleMapInteract);

      map.on("load", () => {
        if (!active) return;
        const style = map.getStyle();
        const source = style.sources
          ? Object.entries(style.sources).find(([name]) =>
              BUILDING_SOURCE_CANDIDATES.includes(name),
            )?.[0]
          : undefined;

        if (!map.getSource("bkkx-esri-imagery")) {
          try {
            map.addSource("bkkx-esri-imagery", {
              type: "raster",
              tiles: ESRI_IMAGERY_TILES,
              tileSize: 256,
              attribution: ESRI_IMAGERY_ATTRIBUTION,
              maxzoom: 19,
            });
            map.addLayer({
              id: "bkkx-satellite",
              type: "raster",
              source: "bkkx-esri-imagery",
              paint: {
                "raster-opacity": 0.78,
                "raster-saturation": -0.45,
                "raster-contrast": 0.08,
                "raster-brightness-min": 0.04,
                "raster-brightness-max": 0.96,
              },
            });
          } catch (err) {
            console.warn("bkkx: satellite layer failed", err);
          }
        }

        if (source && !map.getLayer("bkkx-roads-minor")) {
          const addLine = (
            id: string,
            filter: maplibregl.ExpressionSpecification,
            color: string,
            width: maplibregl.ExpressionSpecification,
            opacity = 0.85,
          ) => {
            try {
              map.addLayer({
                id,
                type: "line",
                source,
                "source-layer": "transportation",
                filter,
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                  "line-color": color,
                  "line-width": width,
                  "line-opacity": opacity,
                },
              });
            } catch (err) {
              console.warn(`bkkx: road layer ${id} failed`, err);
            }
          };

          addLine("bkkx-roads-minor", ROAD_TIER_FILTERS.minor, "#2c2d28", roadLineWidth(0.3, 2.4), 0.7);
          addLine("bkkx-roads-major", ROAD_TIER_FILTERS.major, "#5e6157", roadLineWidth(0.4, 3.6), 0.9);
          addLine("bkkx-roads-motorway", ROAD_TIER_FILTERS.motorway, "#c9ff38", roadLineWidth(0.6, 5.2), 1.0);
        }

        if (source && !map.getLayer("bkkx-3d-buildings")) {
          try {
            map.addLayer({
              id: "bkkx-3d-buildings",
              type: "fill-extrusion",
              source,
              "source-layer": "building",
              minzoom: 13,
              paint: BKKX_BUILDING_PAINT,
            });
          } catch (err) {
            console.warn("bkkx: 3d buildings layer failed", err);
          }
        }

        // Add BMA Urban Planning & Cultural Conservation Zoning GeoJSON
        if (hasHistoricContext && !map.getSource("bkkx-zoning-src")) {
          try {
            map.addSource("bkkx-zoning-src", {
              type: "geojson",
              data: BKK_URBAN_ZONING_GEOJSON as unknown as maplibregl.GeoJSONSourceSpecification["data"],
            });

            map.addLayer({
              id: "bkkx-zoning-fill",
              type: "fill",
              source: "bkkx-zoning-src",
              filter: ["==", "$type", "Polygon"],
              paint: {
                "fill-color": ["get", "fillColor"],
                "fill-opacity": ["get", "opacity"],
              },
            });

            map.addLayer({
              id: "bkkx-zoning-line",
              type: "line",
              source: "bkkx-zoning-src",
              paint: {
                "line-color": ["get", "strokeColor"],
                "line-width": [
                  "case",
                  ["==", ["get", "category"], "Canal"],
                  3.5,
                  ["==", ["get", "category"], "Boulevard"],
                  3.0,
                  2.0,
                ],
                "line-dasharray": [
                  "case",
                  ["==", ["get", "category"], "Conservation"],
                  ["literal", [2, 2]],
                  ["literal", [1, 0]],
                ],
                "line-opacity": 0.9,
              },
            });
          } catch (err) {
            console.warn("bkkx: zoning layer failed", err);
          }
        }

        setMapReady(true);
      });

      // Add Walkthrough Chapter Markers
      world.stops.forEach((stop, index) => {
        const coord = parseCoordinates(stop.coordinates);
        if (!coord) return;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "bkkx-marker";
        el.setAttribute("aria-label", `Open chapter ${index + 1}: ${stop.name}`);
        const label = document.createElement("span");
        label.textContent = String(index + 1).padStart(2, "0");
        el.appendChild(label);
        el.addEventListener("click", (event) => {
          event.preventDefault();
          setIsTourPlaying(false);
          setActiveStopId(stop.id);
          setTourIndex(index);
          map.flyTo({ center: coord, zoom: 16.6, pitch: 64, speed: 0.9, essential: true });
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat(coord)
          .addTo(map);
        markerRefs.current.push(marker);
      });

      // Add Fine Arts Heritage Markers
      if (hasHistoricContext) {
        FINEARTS_HERITAGE_SITES.forEach((site) => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "bkkx-heritage-marker";
          el.setAttribute("aria-label", `Heritage site: ${site.name} (${site.thai})`);
          el.title = `${site.name} · ${site.thai}`;
          el.innerHTML = `<span class="fa-icon">🏛️</span><span class="fa-label">${site.name.split(" ")[0]}</span>`;
          el.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedHeritage(site);
            map.flyTo({
              center: site.coordinates,
              zoom: 17.2,
              pitch: 65,
              speed: 0.8,
              essential: true,
            });
          });
          const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
            .setLngLat(site.coordinates)
            .addTo(map);
          heritageMarkerRefs.current.push(marker);
        });
      }

      mapRef.current = map;
      mapInstance = map;

      resizeObserverInstance = new ResizeObserver(() => map.resize());
      resizeObserverInstance.observe(map.getContainer());
    });

    return () => {
      active = false;
      if (resizeObserverInstance) {
        resizeObserverInstance.disconnect();
      }
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      heritageMarkerRefs.current.forEach((marker) => marker.remove());
      heritageMarkerRefs.current = [];
      if (mapInstance) {
        mapInstance.remove();
      }
      mapRef.current = null;
    };
  }, [world, hasHistoricContext, initialView]);

  // Synchronize Zoning Layer visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (map.getLayer("bkkx-zoning-fill")) {
      map.setLayoutProperty("bkkx-zoning-fill", "visibility", showZoning ? "visible" : "none");
    }
    if (map.getLayer("bkkx-zoning-line")) {
      map.setLayoutProperty("bkkx-zoning-line", "visibility", showZoning ? "visible" : "none");
    }
  }, [showZoning, mapReady]);

  // Synchronize Heritage Markers visibility
  useEffect(() => {
    heritageMarkerRefs.current.forEach((marker) => {
      const el = marker.getElement();
      if (el) {
        el.style.display = showHeritage ? "inline-flex" : "none";
      }
    });
  }, [showHeritage]);

  // Handle atmosphere paint updates dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const styles = getStylesForConfig(timeMode, weatherMode);
    const light = getAmbientLight(timeMode);

    map.setLight({
      anchor: "viewport",
      color: light.color,
      intensity: light.intensity,
      position: light.position as [number, number, number],
    });

    if (map.getLayer("bkkx-satellite")) {
      map.setPaintProperty("bkkx-satellite", "raster-opacity", styles.satOpacity);
      map.setPaintProperty("bkkx-satellite", "raster-saturation", styles.satSaturation);
      map.setPaintProperty("bkkx-satellite", "raster-brightness-max", styles.satBrightness);
      map.setPaintProperty("bkkx-satellite", "raster-contrast", styles.satContrast);
    }

    if (map.getLayer("bkkx-3d-buildings")) {
      map.setPaintProperty("bkkx-3d-buildings", "fill-extrusion-color", styles.buildingColor);
      map.setPaintProperty("bkkx-3d-buildings", "fill-extrusion-opacity", styles.buildingOpacity);
    }

    if (map.getLayer("bkkx-roads-motorway")) {
      map.setPaintProperty("bkkx-roads-motorway", "line-color", styles.motorwayColor);
    }
    if (map.getLayer("bkkx-roads-major")) {
      map.setPaintProperty("bkkx-roads-major", "line-color", styles.majorRoadColor);
    }
    if (map.getLayer("bkkx-roads-minor")) {
      map.setPaintProperty("bkkx-roads-minor", "line-color", styles.minorRoadColor);
    }
  }, [timeMode, weatherMode, mapReady]);

  // Handle stop switching when user is NOT in tour mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || isTourPlaying || initialView) return;
    const stop = world.stops.find((item) => item.id === activeStopId);
    if (!stop) return;
    const coord = parseCoordinates(stop.coordinates);
    if (!coord) return;
    map.flyTo({ center: coord, zoom: 16.6, pitch: 64, speed: 0.7, essential: true });
  }, [activeStopId, mapReady, world.stops, isTourPlaying, initialView]);

  // Cinematic Tour Orchestrator
  useEffect(() => {
    if (!isTourPlaying) {
      if (tourTimerRef.current) {
        clearTimeout(tourTimerRef.current);
        tourTimerRef.current = null;
      }
      return;
    }

    const map = mapRef.current;
    if (!map || !mapReady) return;

    const stop = world.stops[tourIndex];
    if (!stop) return;

    const coord = parseCoordinates(stop.coordinates);
    if (!coord) return;

    map.flyTo({
      center: coord,
      zoom: 16.8,
      pitch: 65,
      bearing: -30 + (tourIndex * 40) % 360,
      speed: 0.3,
      curve: 1.4,
      essential: true
    });

    tourTimerRef.current = setTimeout(() => {
      setTourIndex((prev) => (prev + 1) % world.stops.length);
    }, 10000);

    return () => {
      if (tourTimerRef.current) {
        clearTimeout(tourTimerRef.current);
      }
    };
  }, [isTourPlaying, tourIndex, mapReady, world.stops]);

  // Calculate dynamic haze opacity
  const hazeOpacity = useMemo(() => {
    if (weatherMode !== "hazepm25") return 0;
    if (pm25 === null) return 0.35;
    return Math.min(0.85, Math.max(0.2, (pm25 / 150) * 0.7 + 0.15));
  }, [weatherMode, pm25]);

  return (
    <main className={`atlas-page${embedded ? " is-embedded" : ""}`}>
      {!embedded && <header className="atlas-header">
        <Link className="wordmark" href="/" aria-label="BKKx home">
          <span>BKK</span>
          <b>x</b>
        </Link>
        <div className="atlas-header-meta">
          <span className="atlas-eyebrow">
            World {world.number} · 3D Atlas
          </span>
          <strong>{world.name}</strong>
          <small><span lang="th">{world.thai}</span> · {world.distance}</small>
        </div>
        <nav className="atlas-header-nav" aria-label="Atlas navigation">
          <Link href="/">Heritage register</Link>
          <Link href="/worlds#atlas">The worlds</Link>
          <a className="atlas-download" href={world.download} target="_blank" rel="noreferrer">
            Download world <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </header>}

      <div className="atlas-map" aria-label={`3D map of ${world.name}, Bangkok`}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* Weather FX Overlays */}
        {weatherMode === "rainy" && (
          <div className="weather-rain-overlay" />
        )}
        {weatherMode === "hazepm25" && (
          <div className="weather-haze-overlay" style={{ opacity: hazeOpacity }} />
        )}

        {/* Floating Atmosphere & Tour control deck */}
        <div className="atlas-control-overlay">
          <div className="control-section">
            <div className="control-header">
              <span>ATMOSPHERE ENGINE</span>
              {isTourPlaying && <span className="tour-live-badge">TOUR ACTIVE</span>}
            </div>

            <button
              onClick={() => {
                if (isTourPlaying) {
                  setIsTourPlaying(false);
                  setActiveStopId(world.stops[tourIndex]?.id ?? world.stops[0].id);
                } else {
                  const idx = world.stops.findIndex(s => s.id === activeStopId);
                  setTourIndex(idx >= 0 ? idx : 0);
                  setIsTourPlaying(true);
                }
              }}
              className={`tour-play-btn ${isTourPlaying ? "is-playing" : ""}`}
            >
              {isTourPlaying ? "⏸ Pause Cinematic Tour" : "▶ Start Cinematic Tour"}
            </button>

            <div className="control-row">
              <small className="control-label">Time of Day</small>
              <div className="btn-group-time" role="group" aria-label="Time of Day Select">
                {(["realtime", "sunrise", "noon", "sunset", "night"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      if (isTourPlaying) {
                        setIsTourPlaying(false);
                        setActiveStopId(world.stops[tourIndex]?.id ?? world.stops[0].id);
                      }
                      setTimeMode(t);
                    }}
                    className={timeMode === t ? "active" : ""}
                    title={t === "realtime" ? "Live Bangkok Time" : t}
                    aria-label={t === "realtime" ? "Switch to live local time" : `Switch to ${t} lighting`}
                  >
                    {t === "realtime" ? "🕒" : t === "sunrise" ? "🌅" : t === "noon" ? "☀️" : t === "sunset" ? "🌇" : "🌙"}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-row">
              <small className="control-label">Weather Mode</small>
              <div className="btn-group-weather" role="group" aria-label="Weather Mode Select">
                {(["clear", "rainy", "hazepm25"] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      if (isTourPlaying) {
                        setIsTourPlaying(false);
                        setActiveStopId(world.stops[tourIndex]?.id ?? world.stops[0].id);
                      }
                      setWeatherMode(w);
                    }}
                    className={weatherMode === w ? "active" : ""}
                    aria-label={w === "clear" ? "Switch to clear sky" : w === "rainy" ? "Switch to rain overlay" : "Switch to PM2.5 smog haze"}
                  >
                    {w === "clear" ? "☀️ Clear" : w === "rainy" ? "🌧️ Rain" : "🌫️ Smog"}
                  </button>
                ))}
              </div>
            </div>

            {weatherMode === "hazepm25" && (
              <div className="pm25-readout">
                <span className="status-dot" style={{ backgroundColor: pm25Status.color }} />
                <span>Bangkok PM2.5: {pm25Status.text}</span>
              </div>
            )}

            {hasHistoricContext && (
              <div className="control-row">
                <small className="control-label">GIS Layers</small>
                <div className="btn-group-layers" role="group" aria-label="GIS Data Layers">
                  <button
                    type="button"
                    onClick={() => setShowHeritage((prev) => !prev)}
                    className={`layer-toggle-btn ${showHeritage ? "active" : ""}`}
                    aria-pressed={showHeritage}
                    aria-label="Toggle Fine Arts Department Heritage Sites"
                  >
                    🏛️ Heritage ({FINEARTS_HERITAGE_SITES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowZoning((prev) => !prev)}
                    className={`layer-toggle-btn ${showZoning ? "active" : ""}`}
                    aria-pressed={showZoning}
                    aria-label="Toggle illustrative historic context overlay"
                  >
                    📐 Historic context
                  </button>
                </div>
                <small className="control-source-note">{BKK_URBAN_ZONING_NOTE}</small>
              </div>
            )}
          </div>
        </div>

        {/* Heritage Inspector Card Popup */}
        {hasHistoricContext && selectedHeritage && (
          <div className="heritage-inspector-card" role="dialog" aria-modal="false" aria-label={`Heritage Site: ${selectedHeritage.name}`}>
            <div className="heritage-card-header">
              <div className="heritage-badge-group">
                <span className="heritage-reg-badge">🏛️ {selectedHeritage.regId}</span>
                <span className="heritage-era-badge">{selectedHeritage.era}</span>
              </div>
              <button
                type="button"
                className="heritage-close-btn"
                onClick={() => setSelectedHeritage(null)}
                aria-label="Close heritage details"
              >
                ✕
              </button>
            </div>
            <h4>{selectedHeritage.name}</h4>
            <p className="heritage-thai" lang="th">{selectedHeritage.thai}</p>
            <p className="heritage-desc">{selectedHeritage.description}</p>
            <div className="heritage-meta-grid">
              <div>
                <span>Typology</span>
                <strong>{selectedHeritage.category}</strong>
              </div>
              <div>
                <span>Founded</span>
                <strong>{selectedHeritage.year}</strong>
              </div>
              <div>
                <span>Historical note</span>
                <small>{selectedHeritage.gazette}</small>
              </div>
            </div>
            <p className="heritage-source-note">
              <a href={FINEARTS_HERITAGE_SOURCE.url} target="_blank" rel="noreferrer">
                {FINEARTS_HERITAGE_SOURCE.name}
              </a>
              {" · "}{FINEARTS_HERITAGE_SOURCE.attribution}
            </p>
          </div>
        )}
      </div>

      {!embedded && <aside className="atlas-panel" aria-live="polite">
        <p className="atlas-panel-eyebrow">{activeStop.chapter}</p>
        <h2>{activeStop.name}</h2>
        <p className="atlas-panel-thai" lang="th">{activeStop.thai}</p>
        <p className="atlas-panel-desc">{activeStop.description}</p>

        <div className="atlas-field-note">
          <span>Field note</span>
          <p>{activeStop.signal}</p>
        </div>

        <p className="atlas-coordinates">{activeStop.coordinates}</p>

        {/* Minecraft Teleport Box */}
        {mcCoords && (
          <div className="minecraft-tp">
            <div className="minecraft-tp-header">
              <span>Minecraft Teleport</span>
              <span className="edition-tag">Java 1.21.4+</span>
            </div>
            <div className="minecraft-tp-body">
              <code>/tp {mcCoords.x} 72 {mcCoords.z}</code>
              <button onClick={copyTpCommand} className="copy-btn">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <ol className="atlas-chapters" aria-label="Chapters">
          {world.stops.map((stop, index) => (
            <li key={stop.id}>
              <button
                type="button"
                className={stop.id === activeStopId ? "is-active" : ""}
                aria-pressed={stop.id === activeStopId}
                onClick={() => {
                  setIsTourPlaying(false);
                  setActiveStopId(stop.id);
                  setTourIndex(index);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{stop.name}</strong>
                <small lang="th">{stop.thai}</small>
              </button>
            </li>
          ))}
        </ol>
        <Link className="atlas-back" href="/#atlas">← Back to walkthrough</Link>
      </aside>}
    </main>
  );
}
