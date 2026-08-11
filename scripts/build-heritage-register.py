#!/usr/bin/env python3
"""
build-heritage-register.py
--------------------------
Build site/public/heritage-register.json — the Bangkok heritage register
that bkk.nonarkara.org explores, and the bridge from each registered
monument to a block coordinate inside the BKKx Minecraft worlds.

Primary source
    Fine Arts Department (กรมศิลปากร), "ข้อมูลบัญชีตำแหน่งโบราณสถาน"
    (registered ancient monument positions), data.go.th dataset
    `gis-finearts`, CC-BY. 8,341 rows nationwide, 571 in Bangkok.

Why not the dataset that was originally suggested: the Ministry of Culture
"สถาปัตยกรรมสำคัญ" set (data.go.th `vw_important_architecture`) covers 72
provinces and contains zero Bangkok records, so it cannot describe this city.
The Fine Arts register is the official register that does.

The coordinate problem, and what is done about it
    397 of the 571 Bangkok rows publish latitude to two decimal places —
    roughly 1.1 km. In the Historic Core, 181 monuments collapse onto 12
    distinct points, 37 of them stacked on 13.75, 100.50. Pinning those
    as-published would put dozens of temples inside each other and hand out
    Minecraft coordinates that lead nowhere.

    So each row is resolved in this order, and the winner is recorded in
    `locatedBy` so any pin can be traced back:
      1. the register's own coordinate, when it carries >= 5 decimals
      2. an OpenStreetMap feature whose name matches the register name
      3. nothing — the row keeps district precision, is still listed, and is
         never given a map pin or a block coordinate

    A site is only given Minecraft coordinates when it has building
    precision AND falls inside a generated world's bounds. Everything else
    says so out loud rather than guessing.

Usage:
    python3 scripts/build-heritage-register.py            # uses cached pulls
    python3 scripts/build-heritage-register.py --refresh  # re-download
"""
from __future__ import annotations

import argparse
import collections
import datetime as _dt
import csv
import difflib
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "heritage"
OUT = ROOT / "public" / "heritage-register.json"

# Thai prose in the register runs to 5,000 characters. Sites you can actually
# walk to in a world keep their full record; the rest carry an opening excerpt,
# because nothing in the app reads more than that for them yet.
BLURB_CHARS = 220

FAD_CSV = (
    "https://data.go.th/dataset/d872bd5d-eee0-4b16-9dcd-310d3de31947/"
    "resource/99673341-4ebc-49c5-b2e1-da5d329d949d/download/gis_csv.csv"
)
FAD_DATASET = "https://data.go.th/dataset/gis-finearts"
OVERPASS = "https://overpass.kumi.systems/api/interpreter"
UA = "BKKx/1.0 (+https://bkk.nonarkara.org; heritage register build)"

BANGKOK = "กรุงเทพมหานคร"
REGISTERED = "ขึ้นทะเบียนแล้ว"  # vs รอพิจารณาขึ้นทะเบียน (awaiting consideration)

# Bounds are read from the world manifests so this file can never drift from
# the worlds people actually download.
WORLD_IDS = ("bangkok-historic-core-java", "bangkok-ratchathewi-java")

# One bbox covering both worlds with a margin, split by tag group because a
# single unqualified query over this area times Overpass out.
BBOX = (13.728, 100.468, 13.784, 100.578)
OSM_GROUPS = {
    "worship": 'nwr["name"]["amenity"="place_of_worship"]{bb};',
    "historic": 'nwr["name"]["historic"]{bb};nwr["name"]["tourism"]{bb};',
    "bridges": 'nwr["name"]["bridge"]{bb};nwr["name"]["man_made"="bridge"]{bb};',
    "water": 'nwr["name"]["waterway"]{bb};',
    "places": 'nwr["name"]["place"]{bb};nwr["name"]["leisure"="park"]{bb};'
              'nwr["name"]["barrier"~"city_wall|gate"]{bb};',
    "civic": 'nwr["name"]["amenity"~"school|university|hospital|theatre|library'
             '|prison|townhall|courthouse"]{bb};nwr["name"]["office"="government"]{bb};',
}

# Royal monastery suffixes. The register writes วัดราชบพิธ where OSM writes
# วัดราชบพิธสถิตมหาสีมารามราชวรวิหาร — same temple, and stripping the rank
# from either side is what lets them meet.
RANK_SUFFIXES = (
    "ราชวรมหาวิหาร", "ราชวรวิหาร", "วรมหาวิหาร", "วรวิหาร",
    "ราชวราราม", "มหาวิหาร", "วิหาร",
)

# Measured against this dataset: every correct Thai spelling-variant pair
# scores >= 0.917 (วัดสุทัศน์เทพวราราม ~ วัดสุทัศนเทพวราราม), while
# วัดอินทาราม ~ วัดอมรินทราราม — two different temples — scores 0.880.
# 0.90 sits in that gap. See self_check().
FUZZY_CUTOFF = 0.90
MIN_STEM_FOR_PREFIX = 6

# Fuzzy matching is what recovers สุทัศน์เทพวราราม → สุทัศนเทพวราราม, and it
# is also what tried to put สะพานพระราม 6 on the Rama VIII bridge. Two guards,
# both learned from real bad matches in this dataset:
#
#   digits    — สะพานพระราม 6 vs สะพานพระราม 8 differ by one character and
#               are different bridges, kilometres apart. Numbers must agree.
#   type word — วัดบางขุนนนท์ (a temple) fuzzy-matched บางขุนนนท์ (the
#               neighbourhood it sits in). If the register says this is a
#               temple/bridge/fort/palace, the OSM name has to say so too.
TYPE_WORDS = ("วัด", "สะพาน", "ป้อม", "วัง", "ศาล", "มัสยิด", "โบสถ์",
              "เจดีย์", "คลอง", "ตำหนัก", "พระราชวัง", "อนุสาวรีย์")


# --------------------------------------------------------------------------
# fetching


def fetch(url: str, name: str, refresh: bool, data: bytes | None = None) -> bytes:
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if path.exists() and not refresh:
        return path.read_bytes()
    print(f"  fetching {name}…", file=sys.stderr)
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as res:
        body = res.read()
    path.write_bytes(body)
    return body


def load_register(refresh: bool) -> list[dict]:
    # The Fine Arts export is TIS-620/cp874, not UTF-8.
    raw = fetch(FAD_CSV, "gis_csv.csv", refresh)
    text = raw.decode("cp874")
    rows = list(csv.DictReader(io.StringIO(text)))
    return [r for r in rows if (r.get("PROVINCE") or "").strip() == BANGKOK]


def load_osm(refresh: bool) -> list[dict]:
    bb = "({},{},{},{})".format(*BBOX)
    pool: dict[tuple, dict] = {}
    for name, body in OSM_GROUPS.items():
        query = f"[out:json][timeout:180];({body.format(bb=bb)});out center tags;"
        raw = fetch(OVERPASS, f"osm-{name}.json", refresh, data=query.encode("utf-8"))
        try:
            elements = json.loads(raw)["elements"]
        except Exception:
            # Overpass answers 504 as HTML under load. A missing group costs
            # match rate, never correctness — the unmatched rows simply stay
            # at district precision.
            print(f"  WARN: overpass group '{name}' unusable, skipping", file=sys.stderr)
            continue
        for el in elements:
            if (el.get("tags") or {}).get("name"):
                pool[(el["type"], el["id"])] = el
    return list(pool.values())


def spawn_y(world_dir: Path) -> int | None:
    """Read SpawnY out of level.dat so the /tp command lands on the ground.

    These worlds are superflat, so one height is right everywhere; reading the
    real value beats assuming Minecraft's default of 64, which is ~120 blocks
    of freefall above a world whose ground sits near y = -60.
    """
    level = world_dir / "level.dat"
    if not level.exists():
        return None
    try:
        import gzip
        import struct
        raw = gzip.open(level, "rb").read()
        i = raw.find(b"SpawnY")
        if i < 0:
            return None
        return struct.unpack(">i", raw[i + 6:i + 10])[0]
    except Exception:
        return None


def load_worlds() -> dict[str, dict]:
    worlds = {}
    for wid in WORLD_IDS:
        world_dir = ROOT / "worlds" / wid
        manifest = world_dir / "bkkx-manifest.json"
        if not manifest.exists():
            continue
        m = json.loads(manifest.read_text(encoding="utf-8"))
        b, mc = m["geography"]["bounds"], m["minecraft_bounds"]
        worlds[wid] = {
            "id": wid,
            "title": m["title"],
            "minLat": b["min_lat"], "maxLat": b["max_lat"],
            "minLon": b["min_lon"], "maxLon": b["max_lon"],
            "maxX": mc["max_x"], "maxZ": mc["max_z"],
            "spawnY": spawn_y(world_dir),
        }
    return worlds


# --------------------------------------------------------------------------
# name matching


def normalise(name: str) -> str:
    name = re.sub(r"\(.*?\)", "", name or "")
    return re.sub(r"[\s​·,.\-\"“”'()]", "", name)


def stem(name: str) -> str:
    s = normalise(name)
    for suffix in sorted(RANK_SUFFIXES, key=len, reverse=True):
        if s.endswith(suffix) and len(s) - len(suffix) >= 5:
            return s[: -len(suffix)]
    return s


def centre(el: dict) -> tuple[float | None, float | None]:
    if el["type"] == "node":
        return el.get("lat"), el.get("lon")
    c = el.get("center") or {}
    return c.get("lat"), c.get("lon")


def build_index(osm: list[dict]) -> tuple[dict, list[str]]:
    index: dict[str, list[dict]] = collections.defaultdict(list)
    for el in osm:
        lat, lon = centre(el)
        if lat is None or lon is None:
            continue
        tags = el["tags"]
        names = {tags.get("name"), tags.get("name:th"),
                 tags.get("official_name"), tags.get("alt_name")}
        for nm in names:
            if not nm:
                continue
            index[normalise(nm)].append(el)
            index[stem(nm)].append(el)
    return index, list(index.keys())


def compatible(register_name: str, candidate: str) -> bool:
    """Reject fuzzy pairs that read alike but cannot be the same place."""
    if re.findall(r"\d+", register_name) != re.findall(r"\d+", candidate):
        return False
    for word in TYPE_WORDS:
        if register_name.startswith(word) and word not in candidate:
            return False
    return True


def resolve(name: str, index: dict, keys: list[str]) -> tuple[dict | None, str]:
    """Return (osm element, how it was matched). Order is strictest first."""
    exact, root = normalise(name), stem(name)
    if exact in index:
        return index[exact][0], "exact"
    if root in index:
        return index[root][0], "rank-suffix"
    if len(root) >= MIN_STEM_FOR_PREFIX:
        prefixed = [k for k in keys if k.startswith(root) and compatible(root, k)]
        if prefixed:
            # shortest wins: วัดราชบพิธ should land on the temple, not on a
            # longer name that merely starts the same way
            return index[min(prefixed, key=len)][0], "prefix"
    for candidate in difflib.get_close_matches(root, keys, n=8, cutoff=FUZZY_CUTOFF):
        if compatible(root, candidate):
            return index[candidate][0], "fuzzy"
    return None, "unmatched"


# --------------------------------------------------------------------------
# geometry


def as_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def decimals(value: str) -> int:
    return len(value.split(".")[-1]) if value and "." in value else 0


def to_block(lat: float, lon: float, world: dict) -> dict:
    """Linear local projection, 1 block = 1 metre, straight off the manifest.

    Minecraft north is -Z, so the world's northern edge (max_lat) is z = 0
    and z grows southward.
    """
    x = (lon - world["minLon"]) / (world["maxLon"] - world["minLon"]) * world["maxX"]
    z = (world["maxLat"] - lat) / (world["maxLat"] - world["minLat"]) * world["maxZ"]
    return {"x": round(x), "z": round(z)}


def find_world(lat: float, lon: float, worlds: dict) -> dict | None:
    for world in worlds.values():
        if (world["minLat"] <= lat <= world["maxLat"]
                and world["minLon"] <= lon <= world["maxLon"]):
            return world
    return None


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def gazette(row: dict) -> dict | None:
    vol, part, date = clean(row.get("ROYAL_VOL")), clean(row.get("ROYAL_PART")), clean(row.get("ROYAL_DATE"))
    if not vol and not part:
        return None
    return {"volume": vol, "part": part, "date": date, "topic": clean(row.get("ROYAL_TOPIC"))}


# --------------------------------------------------------------------------


def self_check() -> None:
    """The matcher's edge cases, as assertions. Runs on every build.

    Each case is a real pair this script got wrong at some point. Loosening
    the cutoff or dropping a guard breaks the build here rather than quietly
    putting a temple on the wrong side of the river.
    """
    ratio = lambda a, b: difflib.SequenceMatcher(None, stem(a), stem(b)).ratio()

    # Same place, spelled differently — must stay above the cutoff.
    for a, b in [
        ("วัดสุทัศน์เทพวราราม", "วัดสุทัศนเทพวรารามราชวรมหาวิหาร"),
        ("สะพานดำรงสถิตย์", "สะพานดำรงสถิต"),
        ("ป้อมวิชัยประสิทธิ์", "ป้อมวิไชยประสิทธิ์"),
        ("วัดพลับพลาไชย (วัดโคก หรือวัดคอก)", "วัดพลับพลาชัย"),
    ]:
        assert ratio(a, b) >= FUZZY_CUTOFF, f"should still match: {a} ~ {b}"

    # Different places that read alike — must be rejected.
    assert ratio("วัดอินทาราม", "วัดอมรินทรารามวรวิหาร") < FUZZY_CUTOFF, \
        "วัดอินทาราม and วัดอมรินทราราม are different temples"
    assert not compatible(stem("สะพานพระราม 6"), stem("สะพานพระราม 8")), \
        "digit guard: Rama VI and Rama VIII are different bridges"
    assert not compatible(stem("วัดบางขุนนนท์"), stem("บางขุนนนท์")), \
        "type guard: a temple is not the neighbourhood it sits in"

    # The projection must put the northern edge at z = 0 and grow southward,
    # and the western edge at x = 0 and grow eastward.
    w = {"minLat": 13.0, "maxLat": 14.0, "minLon": 100.0, "maxLon": 101.0,
         "maxX": 1000, "maxZ": 1000}
    assert to_block(14.0, 100.0, w) == {"x": 0, "z": 0}, "NW corner is 0,0"
    assert to_block(13.0, 101.0, w) == {"x": 1000, "z": 1000}, "SE corner is max"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh", action="store_true", help="re-download sources")
    args = ap.parse_args()
    self_check()

    print("building Bangkok heritage register…", file=sys.stderr)
    register = load_register(args.refresh)
    osm = load_osm(args.refresh)
    worlds = load_worlds()
    index, keys = build_index(osm)
    print(f"  register rows: {len(register)}  osm pool: {len(osm)}  worlds: {len(worlds)}",
          file=sys.stderr)

    sites = []
    how = collections.Counter()
    for row in register:
        name = clean(row.get("POS_NAME_T"))
        if not name:
            continue

        lat, lon = as_float(row.get("POS_LAT")), as_float(row.get("POS_LONG"))
        published_precise = decimals(row.get("POS_LAT", "")) >= 5 and lat and lon

        if published_precise:
            precision, located_by = "building", "fine-arts"
        else:
            el, method = resolve(name, index, keys)
            if el:
                lat, lon = centre(el)
                precision = "building"
                located_by = f"osm:{el['type']}/{el['id']}:{method}"
            else:
                # District centroid is not published either, so this row gets
                # no coordinate at all rather than a plausible-looking one.
                precision, located_by = "district", "unlocated"
        how[located_by.split(":")[0] if precision == "building" else "unlocated"] += 1

        site = {
            "id": f"fad-{clean(row.get('POS_ID'))}",
            "name": name,
            "district": clean(row.get("AMPHOE")),
            "subDistrict": clean(row.get("TAMBON")),
            "road": clean(row.get("POS_ROAD")),
            "registered": clean(row.get("REG_REGISTER")) == REGISTERED,
            "registerStatus": clean(row.get("REG_REGISTER")),
            "gazette": gazette(row),
            "precision": precision,
            "locatedBy": located_by,
        }

        world = None
        if precision == "building":
            site["lat"] = round(lat, 6)
            site["lon"] = round(lon, 6)
            world = find_world(lat, lon, worlds)
            if world:
                site["world"] = world["id"]
                site["block"] = to_block(lat, lon, world)

        history = clean(row.get("REG_HISTORY"))
        if world:
            site["history"] = history
            site["artCulture"] = clean(row.get("REG_ART_CULTURE"))
            site["present"] = clean(row.get("REG_PRESENT"))
        elif history:
            site["blurb"] = history[:BLURB_CHARS]
            site["blurbTruncated"] = len(history) > BLURB_CHARS

        sites.append(site)

    # Stable order: walkable sites first, then by district, then by name.
    sites.sort(key=lambda s: (0 if s.get("block") else 1, s["district"], s["name"]))

    in_world = collections.Counter(s["world"] for s in sites if s.get("world"))
    payload = {
        "source": {
            "name": "กรมศิลปากร — ข้อมูลบัญชีตำแหน่งโบราณสถาน",
            "nameEn": "Fine Arts Department — registered ancient monument positions",
            "dataset": FAD_DATASET,
            "licence": "Creative Commons Attribution",
            "coordinateNote": (
                "The register publishes many Bangkok coordinates to two decimal "
                "places (~1.1 km). Those rows are relocated by matching the "
                "monument name against OpenStreetMap; every site records how it "
                "was located in `locatedBy`. Rows that match nothing keep "
                "district precision and are never pinned."
            ),
            "osmAttribution": "© OpenStreetMap contributors, ODbL 1.0",
            "retrieved": _dt.date.today().isoformat(),
        },
        "worlds": {
            w["id"]: {
                "title": w["title"],
                "bounds": {"minLat": w["minLat"], "maxLat": w["maxLat"],
                           "minLon": w["minLon"], "maxLon": w["maxLon"]},
                "blocks": {"maxX": w["maxX"], "maxZ": w["maxZ"]},
                "spawnY": w["spawnY"],
                "siteCount": in_world.get(w["id"], 0),
            }
            for w in worlds.values()
        },
        "counts": {
            "total": len(sites),
            "registered": sum(1 for s in sites if s["registered"]),
            "awaiting": sum(1 for s in sites if not s["registered"]),
            "buildingPrecision": sum(1 for s in sites if s["precision"] == "building"),
            "districtPrecision": sum(1 for s in sites if s["precision"] == "district"),
            "walkable": sum(1 for s in sites if s.get("block")),
            "byWorld": dict(in_world),
        },
        "sites": sites,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")

    c = payload["counts"]
    print(f"wrote {OUT.relative_to(ROOT)}", file=sys.stderr)
    print(f"  {c['total']} Bangkok monuments · {c['registered']} registered, "
          f"{c['awaiting']} awaiting", file=sys.stderr)
    print(f"  located: {c['buildingPrecision']} to a building, "
          f"{c['districtPrecision']} district-only (unpinned)", file=sys.stderr)
    print(f"  walkable in a Minecraft world: {c['walkable']} {c['byWorld']}", file=sys.stderr)
    print(f"  how located: {dict(how)}", file=sys.stderr)
    print(f"  size: {OUT.stat().st_size/1024:.0f} KB", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
