# BKKxCulture — Bangkok's heritage, block by block

<img src="docs/banner.png" alt="BKKxC(ulture) system — Bangkok's heritage, block by block" width="100%" />

**Live at [bkk.nonarkara.org](https://bkk.nonarkara.org).**

This is the source for the Culture half of the **BKKx** pair. The other half
is the operational city twin — live traffic, air quality, heat, flooding,
CCTV, land price — at [atlas.nonarkara.org](https://atlas.nonarkara.org)
([Nonarkara/bkk-3d-atlas](https://github.com/Nonarkara/bkk-3d-atlas)). The
two are deliberately separate systems, separate repos, separate Cloudflare
Workers, separate visual registers (Editorial paper here, Console dark
there) — not two views of one codebase.

## What this is

1. **A 3D map front door.** Nine heritage quarters as quick-jump chips over
   a live 3D atlas view — pick a quarter, the map flies there.
2. **The heritage register** (`/heritage`). Every registered ancient
   monument in Bangkok from the Fine Arts Department's own register — 571
   of them — mapped honestly. A monument is gazetted or awaiting
   consideration, and the register says which.
3. **Nine heritage quarters** (`/areas/:slug`). Rattanakosin, Kudi Chin,
   Talad Noi, Song Wat, Yaowarat & Sampheng, Sam Phraeng, Nang Loeng,
   Charoen Krung, Bang Krachao — authored pages with a licensed photo each
   and the quarter's register monuments.
4. **Seven walking routes** (`/walks/:slug`). Real OSRM foot-profile street
   geometry, numbered stops, register citations, and — where a monument
   falls inside a generated Minecraft world — the block coordinate and
   `/tp` command to stand on it.

## Why the Fine Arts Department register, not the Ministry of Culture one

The dataset most people reach for first —
[`vw_important_architecture`](https://data.go.th/dataset/vw_important_architecture)
(Ministry of Culture) — covers 72 provinces and contains **zero Bangkok
records**. It cannot describe this city. The
[Fine Arts Department register](https://data.go.th/dataset/gis-finearts)
(`gis-finearts`) is the one that does: 8,341 monuments nationwide, 571 in
Bangkok, each with a Royal Gazette citation where gazetted.

## The coordinate problem

397 of the 571 Bangkok rows publish latitude to two decimal places — about
1.1 km. In the Historic Core, 181 monuments collapse onto 12 distinct
points, 37 of them stacked on one. `scripts/build-heritage-register.py`
resolves each row in order — the register's own coordinate when precise
enough, an OpenStreetMap match by name otherwise, nothing if neither
works — and records which method won in `locatedBy`. A row that matches
nothing keeps district precision and is never pinned or given a Minecraft
coordinate; the register says so on the page rather than guessing.

Fuzzy name matching carries two guards, both written after real bad
matches: digits must agree (a match nearly put a Rama VI bridge citation
on the Rama VIII bridge), and the register's type word (วัด, สะพาน, ป้อม…)
must appear in the OpenStreetMap name too (a match nearly put a temple on
the neighbourhood it sits in, not the temple). `self_check()` asserts both
guards and the fuzzy cutoff on every build.

## Build the data

```bash
python3 scripts/build-heritage-register.py          # the 571-monument register
python3 scripts/build-heritage-places.py             # 9 quarters + 7 walks
python3 scripts/fetch-heritage-photos.py             # Commons photos, licence-checked
```

Source pulls cache in `.cache/` (gitignored, rebuilds with `--refresh`).
Photos: Wikimedia Commons only, machine-checked to free licences
(PD/CC0/CC-BY/CC-BY-SA), one photo per slot, full attribution rendered on
every page that uses one — a slot with no licence on record renders
nothing rather than an unattributed image.

Minecraft teleport coordinates come from `worlds/<id>/bkkx-manifest.json`
(the world's real-world bounding box) and `worlds/<id>/level.dat` (the
world's actual spawn height, read directly rather than assumed —
these worlds are superflat with ground near y = −60, and Minecraft's
default spawn height of 64 would drop a visitor over 100 blocks). The
generated Minecraft worlds themselves — the `.mca` region files — are not
duplicated here; they're distributed as
[GitHub Releases on the BKKx repo](https://github.com/Nonarkara/BKKx/releases/latest),
alongside the Minecraft-world walkthrough at `/worlds`.

## Development

```bash
npm install
npm run dev     # local vinext server
npm run build   # Cloudflare Worker bundle in dist/
npm test        # node --test tests/rendered-html.test.mjs
npm run lint
```

Read `CLAUDE.md` before touching design surfaces — it documents the
Editorial/Console split, the type system, and the front-door history.

## Where this deploys from, right now

`bkk.nonarkara.org` is currently deployed from the
[`Nonarkara/BKKx`](https://github.com/Nonarkara/BKKx) monorepo (which also
holds `edge-proxy/`, the custom-domain binding, and the Minecraft world
manifests/releases). This repo is the **dedicated, focused home for the
Culture site's source** going forward — a faithful copy as of the commit
noted below, kept independently buildable end to end. It is not yet the
live deploy source; that migration is a deliberate future step, not
something to assume has already happened.

Copied from `Nonarkara/BKKx` at commit `bcba2dd` (2026-08-11).

## License

Code: MIT (see `LICENSE`). Geographic data: © OpenStreetMap contributors,
ODbL 1.0. Register data: Fine Arts Department, Creative Commons
Attribution. Photos: Wikimedia Commons, individually licensed and
attributed per-page — see `public/heritage/photos.json`.
