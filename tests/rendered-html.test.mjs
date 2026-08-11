import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the Bangkok walkthrough at /worlds", async () => {
  const response = await render("/worlds");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>The Minecraft worlds · BKKxC\(ulture\)<\/title>/i);
  assert.match(html, /Bangkok,/);
  assert.match(html, /block by block\./);
  assert.match(html, /Ratchathewi/);
  assert.match(html, /Historic Core/);
  assert.match(html, /Walk in 3D/);
  assert.match(html, /\/atlas\/ratchathewi/);
  assert.match(html, /application\/ld\+json/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("renders the 3D atlas page for a district", async () => {
  const response = await render("/atlas/ratchathewi");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Ratchathewi — 3D atlas · BKKxC\(ulture\)<\/title>/i);
  assert.match(html, /Ratchathewi/);
  assert.match(html, /ราชเทวี/);
  assert.match(html, /Victory Monument/);
  assert.match(html, /Download world/);
  assert.match(html, /Walk in 3D|atlas-page|bkkx-marker/);
  assert.doesNotMatch(html, /Heritage\s*\([^)]*16|Historic context/);
});

test("limits Old Town context layers to Historic Core", async () => {
  const response = await render("/atlas/historic-core");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Heritage\s*\([^)]*16/);
  assert.match(html, /Historic context/);
  assert.match(html, /orientation only/i);
});

test("returns 404 for an unknown atlas district", async () => {
  const response = await render("/atlas/atlantis");
  assert.equal(response.status, 404);
});

test("serves the 3D map heritage atlas as the front door", async () => {
  // The 3D map is the homepage (2026-08-11 redesign). The Editorial
  // register content moved to /heritage; BKK's own heritage map iframe
  // fills the page, with a 9-quarter quick-jump
  // panel in the side. No "choose your district" gate.
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  // 3D map front door
  assert.match(html, /atlas-shell/);
  assert.match(html, /atlas-shell-map/);
  assert.match(html, /src="\/atlas\/historic-core\?embed=1"/);
  assert.doesNotMatch(html, /src="https:\/\/atlas\.nonarkara\.org/i);
  // 9 quarters as quick-jumps
  assert.match(html, /atlas-shell-quarter-chips/);
  assert.match(html, /Rattanakosin/);
  assert.match(html, /Bang Krachao/);
  assert.match(html, /Kudi Chin/);
  // Register/Walks nav connects to the real anchors on /heritage, not a
  // dead #register on this page or a bare /heritage top scroll.
  assert.match(html, /href="\/heritage#register"/);
  assert.match(html, /href="\/heritage#walks"/);
  // The Minecraft-worlds CTAs and nav tab were placeholders from the
  // pre-redesign era (worlds built before the heritage pivot) and are
  // gone from primary chrome as of 2026-08-11 — the front door promotes
  // the register and walks, not a world download.
  assert.doesNotMatch(html, /Walk Ratchathewi/);
  assert.doesNotMatch(html, /Walk Old Town/);
  assert.doesNotMatch(html, />The worlds</);
  // Editorial register chrome (the shell) is here, the actual
  // register moved to /heritage.
  assert.match(html, /block by block/);
  assert.match(html, /application\/ld\+json/);
});

test("keeps the editorial heritage register at /heritage", async () => {
  // Pre-2026-08-11 the register was at /, with /heritage as a
  // permanentRedirect. After the redesign, /heritage is the actual
  // register page (200), and the homepage is the 3D map. Anyone who
  // saved /heritage during the redirect-stub era now lands on the
  // real register, not a redirect.
  const response = await render("/heritage");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Bangkok&#x27;s heritage,|Bangkok's heritage,/);
  assert.match(html, /monument by monument/);
  assert.match(html, /register-canvas/);
  assert.match(html, /register-filters/);
  assert.match(html, /Fine Arts Department/);
  assert.match(html, /application\/ld\+json/);
});

test("ships a heritage register whose Minecraft coordinates are inside the worlds", async () => {
  // The whole point of the page is that a block coordinate walks you to a
  // real monument. This is the check that fails if the projection, the world
  // bounds, or the register build ever drift apart.
  const { default: register } = await import("../public/heritage-register.json", {
    with: { type: "json" },
  });

  assert.ok(register.counts.walkable > 100, "expected 100+ walkable monuments");
  assert.equal(
    register.sites.filter((site) => site.block).length,
    register.counts.walkable,
  );

  for (const site of register.sites) {
    if (!site.block) continue;
    const world = register.worlds[site.world];
    assert.ok(world, `${site.id} names a world that is not in the payload`);
    assert.ok(
      site.block.x >= 0 && site.block.x <= world.blocks.maxX,
      `${site.id} x=${site.block.x} outside 0..${world.blocks.maxX}`,
    );
    assert.ok(
      site.block.z >= 0 && site.block.z <= world.blocks.maxZ,
      `${site.id} z=${site.block.z} outside 0..${world.blocks.maxZ}`,
    );
  }

  // A district-precision row must never carry a coordinate — that is the
  // difference between "we do not know" and a plausible-looking guess.
  for (const site of register.sites) {
    if (site.precision !== "district") continue;
    assert.equal(site.lat, undefined, `${site.id} is district-precision but pinned`);
    assert.equal(site.block, undefined, `${site.id} is district-precision but walkable`);
  }
});

test("renders a heritage quarter page with photo attribution", async () => {
  const response = await render("/areas/kudi-chin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Kudi Chin/);
  assert.match(html, /Santa Cruz/);
  assert.match(html, /Wikimedia Commons/);
  assert.match(html, /CC BY/i);
  assert.match(html, /In the Fine Arts register/);
});

test("renders a heritage walk page with numbered stops", async () => {
  const response = await render("/walks/six-faiths");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Six Faiths of Kudi Chin/);
  assert.match(html, /Wat Kalayanamit/);
  assert.match(html, /Bang Luang Mosque/);
  assert.match(html, /walk-stop-n/);
  assert.match(html, /OSRM foot profile/);
});

test("walk pages show real gazette and leg-distance numbers, not estimates", async () => {
  const response = await render("/walks/six-faiths");
  assert.equal(response.status, 200);
  const html = await response.text();
  // "By the numbers" block: gazetted/awaiting split, oldest gazette age
  assert.match(html, /By the numbers/);
  assert.match(html, /gazetted/);
  assert.match(html, /Oldest gazette entry/);
  assert.match(html, /years ago/);
  // Per-stop: at least one real OSRM leg distance rendered. React splits
  // adjacent JSX expressions with hydration comment markers, so match
  // loosely rather than assuming the numbers sit next to their words.
  assert.match(html, /walk-stop-numbers/);
  assert.match(html, /m from stop/);
  assert.match(html, /min walk/);
});

test("heritage-places.json carries real per-stop and per-walk numbers", async () => {
  const { default: places } = await import("../app/data/heritage-places.json", {
    with: { type: "json" },
  });
  for (const walk of places.walks) {
    assert.ok(walk.stats, `${walk.slug}: missing stats`);
    assert.ok(
      walk.stats.gazetted + walk.stats.awaitingConsideration === walk.stats.citedInRegister,
      `${walk.slug}: gazetted+awaiting must equal citedInRegister`,
    );
    // Every stop after the first on a routed walk carries a real OSRM leg —
    // never a straight-line guess standing in for one.
    if (walk.distanceM) {
      for (const stop of walk.stops.slice(1)) {
        assert.ok(
          typeof stop.distanceFromPrevM === "number" && stop.distanceFromPrevM > 0,
          `${walk.slug}/${stop.name}: missing real leg distance`,
        );
      }
    }
  }
});

test("404s an unknown quarter and an unknown walk", async () => {
  assert.equal((await render("/areas/atlantis")).status, 404);
  assert.equal((await render("/walks/atlantis")).status, 404);
});

test("heritage places data is internally consistent", async () => {
  const { default: places } = await import("../app/data/heritage-places.json", {
    with: { type: "json" },
  });
  const { default: photos } = await import("../public/heritage/photos.json", {
    with: { type: "json" },
  });
  const { default: geometry } = await import("../public/heritage-walk-geometry.json", {
    with: { type: "json" },
  });
  const { existsSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");

  const walkSlugs = new Set(places.walks.map((w) => w.slug));
  const okLicence = /^(PD|Public domain|CC0|CC[ -]?BY)/i;

  for (const area of places.areas) {
    // every walk an area advertises must exist
    for (const w of area.walks) assert.ok(walkSlugs.has(w), `${area.slug} -> missing walk ${w}`);
    // every area photo must exist on disk with a free licence on record
    const photo = photos[area.photo];
    assert.ok(photo, `${area.slug}: no attribution entry for photo '${area.photo}'`);
    assert.match(photo.licence, okLicence, `${area.slug}: licence '${photo.licence}' not free`);
    const onDisk = fileURLToPath(new URL(`../public${photo.file}`, import.meta.url));
    assert.ok(existsSync(onDisk), `${area.slug}: photo file missing ${photo.file}`);
  }

  // no photo reused across slots
  const titles = Object.values(photos).map((p) => p.title);
  assert.equal(new Set(titles).size, titles.length, "a Commons photo is used twice");

  for (const walk of places.walks) {
    assert.ok(walk.stops.length >= 4, `${walk.slug}: fewer than 4 stops`);
    for (const stop of walk.stops) {
      assert.ok(
        typeof stop.lat === "number" && typeof stop.lon === "number",
        `${walk.slug}/${stop.name}: unresolved stop`,
      );
      // a hand-placed stop must say so and say why
      if (stop.locatedBy === "hand") {
        assert.ok(stop.approx && stop.approxWhy, `${walk.slug}/${stop.name}: silent hand placement`);
      }
    }
    // routed walks carry a line whose ends sit near the first and last stop
    const geom = geometry[walk.slug];
    if (walk.distanceM) {
      assert.ok(geom?.line?.length > 10, `${walk.slug}: distance without a line`);
      const [flon, flat] = geom.line[0];
      const near = (a, b) => Math.abs(a - b) < 0.005;
      assert.ok(
        near(flat, walk.stops[0].lat) && near(flon, walk.stops[0].lon),
        `${walk.slug}: route line does not start at stop 1`,
      );
    }
  }
});

test("renders the About page with all nine essay photos", async () => {
  const response = await render("/about");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /The city that never got the plaque/);
  assert.match(html, /Thammasat/);
  assert.match(html, /Penang.*Kyoto.*Vienna.*Graz.*Prague.*Warsaw.*Krakow.*Wigan/s);
  assert.match(html, /571 monuments/);
  for (const file of [
    "dr-non-siam-square.jpg", "dr-non-thammasat.jpg", "wat-arun-lasers.jpg",
    "temples-everywhere.jpg", "foodstalls-at-night.jpg", "safe-city-night.jpg",
    "shophouses-midnight.jpg", "alley-wat-arun-view.jpg", "bangkok-waterfront.jpg",
    "open-space-oldtown.jpg",
  ]) {
    assert.match(html, new RegExp(`/about/${file}`), `missing photo ${file}`);
  }
});

test("Thai translations cover every area and walk slug, with no stray keys", async () => {
  const { default: places } = await import("../app/data/heritage-places.json", {
    with: { type: "json" },
  });
  const { AREA_TH, WALK_TH, ABOUT_TH } = await import("../app/data/heritage-translations-th.ts");

  const areaSlugs = new Set(places.areas.map((a) => a.slug));
  const walkSlugs = new Set(places.walks.map((w) => w.slug));

  for (const slug of areaSlugs) {
    assert.ok(AREA_TH[slug], `AREA_TH missing translation for ${slug}`);
    assert.ok(AREA_TH[slug].prose.length >= 1, `AREA_TH[${slug}] has no prose`);
  }
  for (const key of Object.keys(AREA_TH)) {
    assert.ok(areaSlugs.has(key), `AREA_TH has a stray slug not in heritage-places.json: ${key}`);
  }

  for (const walk of places.walks) {
    const t = WALK_TH[walk.slug];
    assert.ok(t, `WALK_TH missing translation for ${walk.slug}`);
    for (const stop of walk.stops) {
      assert.ok(
        typeof t.stops[stop.name] === "string" && t.stops[stop.name].length > 0,
        `WALK_TH[${walk.slug}] missing stop translation for "${stop.name}"`,
      );
    }
  }
  for (const key of Object.keys(WALK_TH)) {
    assert.ok(walkSlugs.has(key), `WALK_TH has a stray slug not in heritage-places.json: ${key}`);
  }

  assert.equal(ABOUT_TH.paragraphs.length, 9, "About essay Thai translation must have exactly 9 paragraphs");
  for (const key of ["portrait", "thammasat", "watarun1", "temples", "foodstalls", "safecity", "shophouses", "alley", "waterfront", "openspace"]) {
    assert.ok(ABOUT_TH.captions[key], `ABOUT_TH.captions missing "${key}"`);
  }
});

test("EN and TH dictionaries have exactly matching key sets", async () => {
  const { DICTIONARY } = await import("../app/i18n/dictionary.ts");
  const enKeys = Object.keys(DICTIONARY.en).sort();
  const thKeys = Object.keys(DICTIONARY.th).sort();
  assert.deepEqual(thKeys, enKeys, "dictionary.ts: en/th key sets diverged");
});
