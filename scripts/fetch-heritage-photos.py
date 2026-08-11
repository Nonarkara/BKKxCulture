#!/usr/bin/env python3
"""
fetch-heritage-photos.py
------------------------
Pull one licensed photograph per heritage area from Wikimedia Commons into
site/public/heritage/photos/, with a machine-checked licence and a full
attribution manifest (photos.json) that the pages render as credits.

Rules enforced here, not by convention:
  * Only free licences pass: public domain, CC0, CC-BY, CC-BY-SA (any
    version). Anything else — including NC and ND variants — is rejected.
  * Every accepted file records artist, licence, and source URL; the page
    templates refuse to render a photo slot with no attribution entry.
  * One photo per slot, one slot per photo — no image is reused anywhere
    on the site (workspace photo-reuse rule).

Each slot lists candidate Commons search queries in preference order; the
first hit that passes the licence gate and is large enough wins. Slots can
also pin an exact Commons file title when the search result was reviewed
and a specific image chosen.

Usage:
    python3 scripts/fetch-heritage-photos.py            # fetch missing
    python3 scripts/fetch-heritage-photos.py --refetch  # refetch all
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "heritage" / "photos"
MANIFEST = ROOT / "public" / "heritage" / "photos.json"
API = "https://commons.wikimedia.org/w/api.php"
UA = "BKKx/1.0 (+https://bkk.nonarkara.org; heritage photo fetch)"

WIDTH = 1400          # served width; Commons scales on their side
MIN_SOURCE_W = 1200   # reject thumbnails and low-res scans

OK_LICENCES = re.compile(
    r"^(pd|public domain|cc0|cc[ -]?by(?:[ -]?sa)?(?:[ -]?\d\.\d)?)", re.I
)

# slot -> ordered candidate queries (or ("file", exact Commons title))
SLOTS: dict[str, list] = {
    # Pinned after review: the top search hit for "Wat Arun at dusk" is a
    # mistitled photo of a different temple. Commons titles are not evidence.
    "hero": [("file", "File:Wat Arun on the sunset.jpg")],
    "rattanakosin": ["Grand Palace Bangkok aerial", "Wat Phra Kaew panorama",
                     "Grand Palace Bangkok"],
    "kudi-chin": ["Santa Cruz Church Bangkok", "Kudi Chin", "Wat Prayurawongsawat chedi"],
    # Pinned after review: search's first hit is a cartoon street-art mural —
    # real Talad Noi, wrong register. The 1804 shrine is the quarter.
    "talad-noi": [("file", "File:Cho Su Kong Shrine of Talat Noi ศาลเจ้าโจวซือกง ตลาดน้อย (2021) - img 01.jpg")],
    "songwad": ["Song Wat Road", "Wat Pathum Khongkha", "Sampheng Bangkok"],
    "yaowarat": ["Yaowarat Road night", "Yaowarat Bangkok", "Wat Traimit"],
    "sam-phraeng": ["Phraeng Phuthon", "Phraeng Nara", "Sao Chingcha Giant Swing"],
    "nang-loeng": ["Nang Loeng Market", "Talat Nang Loeng", "Wat Sommanat Bangkok"],
    "charoen-krung": ["Old Customs House Bangkok", "Assumption Cathedral Bangkok",
                      "General Post Office Bangkok"],
    "bang-krachao": ["Bang Kachao", "Bang Krachao aerial", "Sri Nakhon Khuean Khan Park"],
}


def api(params: dict) -> dict:
    query = urllib.parse.urlencode({**params, "format": "json"})
    raw = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-A", UA, f"{API}?{query}"],
        capture_output=True, check=True).stdout
    return json.loads(raw)


def search(query: str) -> list[dict]:
    """Commons file search with imageinfo + licence metadata in one call."""
    data = api({
        "action": "query", "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": 6, "gsrlimit": 8,
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "iiurlwidth": WIDTH,
    })
    pages = (data.get("query") or {}).get("pages") or {}
    return sorted(pages.values(), key=lambda p: p.get("index", 99))


def licence_of(info: dict) -> tuple[str, str, str]:
    meta = info.get("extmetadata") or {}
    get = lambda k: re.sub(r"<[^>]+>", "", (meta.get(k) or {}).get("value") or "").strip()
    return get("LicenseShortName"), get("Artist"), get("Credit")


def pick(slot: str, candidates: list) -> dict | None:
    for cand in candidates:
        results = ([{"title": cand[1]}] if isinstance(cand, tuple)
                   else search(cand))
        if isinstance(cand, tuple):
            data = api({"action": "query", "titles": cand[1], "prop": "imageinfo",
                        "iiprop": "url|size|extmetadata", "iiurlwidth": WIDTH})
            results = list((data.get("query") or {}).get("pages", {}).values())
        for page in results:
            infos = page.get("imageinfo") or []
            if not infos:
                continue
            info = infos[0]
            lic, artist, _ = licence_of(info)
            if not OK_LICENCES.match(lic or ""):
                continue
            if (info.get("width") or 0) < MIN_SOURCE_W:
                continue
            if (info.get("height") or 0) > (info.get("width") or 1):
                continue  # portrait — these slots are landscape editorial breaks
            return {
                "slot": slot,
                "title": page.get("title", ""),
                "url": info.get("thumburl") or info.get("url"),
                "descriptionUrl": info.get("descriptionurl"),
                "licence": lic,
                "artist": artist or "unknown (see source page)",
                "width": info.get("thumbwidth") or info.get("width"),
                "height": info.get("thumbheight") or info.get("height"),
            }
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refetch", action="store_true")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

    used_titles = set()
    for slot, candidates in SLOTS.items():
        if slot in manifest and not args.refetch:
            used_titles.add(manifest[slot]["title"])
            continue
        choice = pick(slot, candidates)
        if not choice:
            print(f"  MISS {slot}: no freely licensed landscape image found", file=sys.stderr)
            continue
        if choice["title"] in used_titles:
            print(f"  SKIP {slot}: {choice['title']} already used by another slot",
                  file=sys.stderr)
            continue
        dest = OUT_DIR / f"{slot}.jpg"
        subprocess.run(["curl", "-sL", "--max-time", "120", "-A", UA,
                        choice["url"], "-o", str(dest)], check=True)
        size = dest.stat().st_size
        if size < 30_000:
            dest.unlink()
            print(f"  MISS {slot}: download too small ({size}b)", file=sys.stderr)
            continue
        choice["file"] = f"/heritage/photos/{slot}.jpg"
        choice["bytes"] = size
        manifest[slot] = choice
        used_titles.add(choice["title"])
        print(f"  OK   {slot:16} {choice['licence']:12} {size//1024:4} KB  "
              f"{choice['title'][:52]}", file=sys.stderr)

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1),
                        encoding="utf-8")
    print(f"wrote {MANIFEST.relative_to(ROOT)} · {len(manifest)}/{len(SLOTS)} slots",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
