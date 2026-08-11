#!/usr/bin/env node
/**
 * fix-asset-manifest.mjs
 * ----------------------
 * Point the RSC asset manifest at chunks that actually exist.
 *
 * vinext builds the client bundle and the RSC preload manifest in two passes,
 * and the hashes can disagree: a clean build emits
 * `dist/client/assets/maplibre-gl-BjusSPiM.js` while the manifest still asks
 * the browser to `modulepreload` `maplibre-gl-B3EYWl7f.js`. The page works —
 * the real import carries the right hash — but every page that lazy-loads
 * MapLibre fires a guaranteed 404 on load.
 *
 * This rewrites only entries whose target file is missing, and only when
 * exactly one built file shares the same chunk name. Anything ambiguous is
 * left alone and reported, because a wrong rewrite would be worse than the
 * 404 it replaces.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "dist/client/assets");
const manifests = [
  join(root, "dist/server/__vite_rsc_assets_manifest.js"),
  join(root, "dist/server/ssr/__vite_rsc_assets_manifest.js"),
];

if (!existsSync(assetsDir)) {
  console.error("fix-asset-manifest: no dist/client/assets — run the build first");
  process.exit(1);
}

const built = readdirSync(assetsDir);
// "maplibre-gl-BjusSPiM.js" -> name "maplibre-gl", ext "js"
const split = (file) => {
  const m = /^(.*)-([A-Za-z0-9_-]{8})\.(js|css)$/.exec(file);
  return m ? { name: m[1], hash: m[2], ext: m[3] } : null;
};

const byName = new Map();
for (const file of built) {
  const parts = split(file);
  if (!parts) continue;
  const key = `${parts.name}.${parts.ext}`;
  byName.set(key, [...(byName.get(key) ?? []), file]);
}

let fixed = 0;
let skipped = 0;

for (const manifestPath of manifests) {
  if (!existsSync(manifestPath)) continue;
  const original = readFileSync(manifestPath, "utf8");
  const updated = original.replace(
    /assets\/([A-Za-z0-9._-]+-[A-Za-z0-9_-]{8}\.(?:js|css))/g,
    (whole, file) => {
      if (built.includes(file)) return whole;
      const parts = split(file);
      if (!parts) return whole;
      const candidates = byName.get(`${parts.name}.${parts.ext}`) ?? [];
      if (candidates.length !== 1) {
        console.warn(
          `fix-asset-manifest: ${file} is missing and ${candidates.length} chunks match — left as-is`,
        );
        skipped += 1;
        return whole;
      }
      console.log(`fix-asset-manifest: ${file} -> ${candidates[0]}`);
      fixed += 1;
      return `assets/${candidates[0]}`;
    },
  );
  if (updated !== original) writeFileSync(manifestPath, updated);
}

console.log(`fix-asset-manifest: ${fixed} rewritten, ${skipped} left alone`);
if (skipped > 0) process.exitCode = 0; // reporting only; never fail the build
