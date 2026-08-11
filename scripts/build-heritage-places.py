#!/usr/bin/env python3
"""
build-heritage-places.py
------------------------
Build the neighbourhood-and-walks layer of bkk.nonarkara.org:

    site/app/data/heritage-places.json      areas + walks, prose, resolved stops
                                            (imported by server pages — no geometry)
    site/public/heritage-walk-geometry.json street-following route lines
                                            (fetched by the map client only)

The register (build-heritage-register.py) answers "what is protected."
This file answers "where do I actually walk" — nine heritage quarters and
seven walking routes through them, each stop tied where possible to a real
Fine Arts Department register entry by its `fad` id.

Coordinates come from, in order of preference:
  1. the register (already resolved to building precision there)
  2. OpenStreetMap, resolved by name (cached in .cache/heritage/)
  3. a hand-placed coordinate, always flagged `approx: true` and rendered
     as approximate — used only for stops like the middle of Sanam Luang
     or a shrine wedged between two register neighbours.

Route lines are real street-following walking paths from OSRM's foot
profile (FOSSGIS / routing.openstreetmap.de), cached. If the router is
down at build time the walk keeps its stops and distance is omitted —
the page then says "distances unavailable" instead of inventing them.

Usage:
    python3 scripts/build-heritage-places.py
    python3 scripts/build-heritage-places.py --reroute   # re-fetch OSRM
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "heritage"
REGISTER = ROOT / "public" / "heritage-register.json"
POI = CACHE / "poi-resolve.json"
OUT_DATA = ROOT / "app" / "data" / "heritage-places.json"
OUT_GEOM = ROOT / "public" / "heritage-walk-geometry.json"

OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot/"
UA = "BKKx/1.0 (+https://bkk.nonarkara.org; heritage walks build)"

# --------------------------------------------------------------------------
# Hand-placed coordinates. Every entry here is flagged approximate in the
# output. Each carries the reason it could not be resolved any other way.
HAND = {
    "kian-un-keng": {
        "lat": 13.7395, "lon": 100.4927,
        "why": "register row fad-8876 is unpinned and OSM carries no name; "
               "placed on the riverfront between its register-pinned "
               "neighbours Santa Cruz and Wat Kalayanamit",
    },
    "sanam-luang": {
        "lat": 13.7546, "lon": 100.4930,
        "why": "a 12-hectare field; this is its centre",
    },
    "warehouse-30": {
        "lat": 13.7283, "lon": 100.5133,
        "why": "unnamed warehouse row in OSM; placed beside the "
               "OSM-resolved Portuguese Embassy it adjoins",
    },
    "chalermthani": {
        "lat": 13.7592, "lon": 100.5117,
        "why": "register row fad-5538 is unpinned; the wooden cinema "
               "stands inside the OSM-resolved Nang Loeng market block",
    },
}

# OSM-resolved names (from .cache/heritage/poi-resolve.json + resolve2 run)
WORLDS: dict = {}

OSM_EXTRA = {
    "wat-prayoon": (13.736713, 100.495511, "way/304092138"),
    "portuguese-embassy": (13.727929, 100.513953, "way/342186877"),
    "wat-chak-daeng": (13.662577, 100.547672, "way/1271227441"),
    "bang-krachao-pier": (13.704289, 100.562811, "node/487075704"),
}

# --------------------------------------------------------------------------
# THE NINE QUARTERS
#
# Prose is the product here. Written to be read, not skimmed: what the
# place is, who made it, and what to look for when standing in it.

AREAS = [
    {
        "slug": "rattanakosin",
        "name": "Rattanakosin Island",
        "thai": "เกาะรัตนโกสินทร์",
        "district": "พระนคร",
        "tagline": "The 1782 royal island — palace, pillar and the densest heritage in Thailand.",
        "center": [100.4935, 13.7520],
        "zoom": 14.2,
        "photo": "rattanakosin",
        "prose": [
            "In April 1782 King Rama I crossed the river from Thonburi, drove the City Pillar into the ground, and began digging the canal that turned this bend of the Chao Phraya into an artificial island. Everything the new dynasty needed went inside the moat: the Grand Palace and its royal chapel, the cremation ground at Sanam Luang, the great monasteries, the fortified wall with fourteen forts. The layout copied Ayutthaya deliberately — a capital rebuilt from the memory of the one Burma had burned fifteen years earlier.",
            "The register is densest here of anywhere in Thailand: 141 monuments in Phra Nakhon district alone. Wat Pho holds the 46-metre Reclining Buddha and the marble inscriptions UNESCO lists as Memory of the World; Wat Mahathat has taught vipassana since before the city existed; the Loha Prasat at Wat Ratchanatda raises 37 iron spires on the only building of its kind left anywhere. Of the fourteen forts, two survive — Phra Sumen at the island's northern tip and Mahakan by the Golden Mount.",
            "Walk it early. The palace crowds arrive by nine, but at seven the island still belongs to monks on alms rounds, amulet dealers setting up along Maha Rat Road, and the pigeons of Sanam Luang.",
        ],
        "monuments": ["fad-5574", "fad-71", "fad-12", "fad-62", "fad-65", "fad-39", "fad-9", "fad-3", "fad-5"],
        "walks": ["royal-axis", "sam-phraeng-lanes"],
    },
    {
        "slug": "kudi-chin",
        "name": "Kudi Chin",
        "thai": "กะดีจีน / กุฎีจีน",
        "district": "ธนบุรี",
        "tagline": "Portuguese Bangkok since 1770 — six faiths within one kilometre of riverbank.",
        "center": [100.4930, 13.7385],
        "zoom": 15.2,
        "photo": "kudi-chin",
        "prose": [
            "When King Taksin rebuilt the Siamese capital at Thonburi after the fall of Ayutthaya, he granted this stretch of riverbank to the Portuguese who had fought alongside him. They built Santa Cruz church in 1770; the present dome — Rigotti and Tamagno's 1916 building, the third on the site — still anchors a community that has been Catholic, Thai and part-Portuguese for two and a half centuries. The bakeries in the lanes still make khanom farang kudi chin, a dry sponge cake from a 250-year-old Portuguese recipe, over charcoal.",
            "The remarkable thing about Kudi Chin is what stands within a kilometre of the church. Wat Kalayanamit, whose 15-metre seated Buddha fills a viharn built for it in 1837. The Kian Un Keng shrine, where a Hokkien community has kept a Guanyin altar since before the Chakri dynasty. Wat Prayoon with its white mountain-chedi, whose 2013 restoration won UNESCO's top Asia-Pacific conservation award. And Bang Luang Mosque — Kudi Khao, the White Mosque — built by Ayutthaya-descended Muslims in the form of a Thai temple hall, the only mosque of its kind. Buddhist, Catholic, Chinese and Muslim congregations, all still active, all in earshot of each other's bells.",
            "The Baan Kudichin Museum, run by a Portuguese-descended family in their own house, tells the story in three small floors and serves the cake downstairs.",
        ],
        "monuments": ["fad-130", "fad-5429", "fad-8876", "fad-8877"],
        "walks": ["six-faiths"],
    },
    {
        "slug": "talad-noi",
        "name": "Talad Noi",
        "thai": "ตลาดน้อย",
        "district": "สัมพันธวงศ์",
        "tagline": "The oldest edge of Chinese Bangkok — shrines, engine parts and one Hokkien mansion.",
        "center": [100.5125, 13.7335],
        "zoom": 15.5,
        "photo": "talad-noi",
        "prose": [
            "Talad Noi — 'the little market' — is where Chinese Bangkok frays into the river south of Sampheng. Hokkien families settled here in the first years of the city, earlier than the Teochew waves that filled Yaowarat, and the quarter still runs at their scale: lanes a hand-cart wide, shrine smoke, and forty years of motor-oil black soaked into the concrete of the used-engine-parts trade that took over the godowns after the Second World War.",
            "The San Chao Chow Sue Kong shrine, founded 1804, is among the oldest Hokkien shrines in the country and still runs a vegetarian festival that fills the quarter every ninth lunar month. So Heng Tai, a four-wing Fujian courtyard mansion from the 1790s, survives as the home of the same family eight generations on — its courtyard now, improbably, holds a freediving pool. On the riverfront, the restored godown compound of Hong Sieng Kong stacks Chinese roof tiles over espresso machines, which is the quarter's whole trajectory in one image.",
            "At the southern corner stands Holy Rosary Church — Wat Kalawar, from the Portuguese Calvário — on land granted to Portuguese Catholics in 1787; the present Gothic Revival building went up in the 1890s. A block north, the Fine Arts register lists the Beaux-Arts head office Siam Commercial Bank finished in 1910 — Thailand's first commercial bank, still operating that branch behind the original brass grilles.",
        ],
        "monuments": ["fad-5649", "fad-5650", "fad-5651"],
        "walks": ["talad-noi-songwad", "charoen-krung-creative"],
    },
    {
        "slug": "songwad",
        "name": "Song Wat",
        "thai": "ทรงวาด",
        "district": "สัมพันธวงศ์",
        "tagline": "The road the King drew — godowns and rice-trade shophouses on the river's edge.",
        "center": [100.5065, 13.7390],
        "zoom": 15.5,
        "photo": "songwad",
        "prose": [
            "Song Wat means 'drawn by the King' — Rama V sketched the line of this road himself in the 1890s, cutting a fire-break and a cart route between Sampheng's crowded lane and the river. It became the wholesale artery of Chinese Bangkok: rice, dried goods, spices and hardware moving between the godowns on the water side and the shophouses on the land side. The register protects the whole shophouse run (ตึกแถวริมถนนทรงวาด) as a single monument.",
            "The trade never left — sacks of dried chillies and jasmine rice still come off hand-carts here at dawn — but the last decade layered a second economy over it: galleries, roasters and restaurants moving into godowns whose owners refused for a century to modernise them, which is precisely why they were worth moving into. The 1920 Poey Eng school building, founded by the Teochew community and fronted like a small Chinese civic palace, and the Lao Pun Tao Kong shrine, the Teochew ancestral shrine of the quarter, mark the community that built it all.",
            "Walk it on a weekday morning if you want the trade; on a weekend afternoon if you want the galleries. The two economies use the same doorways at different hours.",
        ],
        "monuments": ["fad-5646", "fad-5651", "fad-5648"],
        "walks": ["talad-noi-songwad"],
    },
    {
        "slug": "yaowarat-sampheng",
        "name": "Yaowarat & Sampheng",
        "thai": "เยาวราช–สำเพ็ง",
        "district": "สัมพันธวงศ์",
        "tagline": "Chinatown proper — 1782 lane, 1890s boulevard, five and a half tonnes of gold.",
        "center": [100.5095, 13.7410],
        "zoom": 15.0,
        "photo": "yaowarat",
        "prose": [
            "When Rama I took the land under today's Grand Palace for his capital in 1782, the Chinese traders already living there were moved downriver to Sampheng. The lane they built — now Soi Wanit 1 — still runs its original course, a covered kilometre of fabric, buttons and gold shops barely two metres wide. Yaowarat Road, the dragon-curved boulevard the neon knows, came a century later, cut between 1891 and 1900 as Chinese Bangkok's front street.",
            "Wat Traimit, at the quarter's eastern gate, holds the Golden Buddha: five and a half tonnes of solid Sukhothai-era gold that spent two centuries disguised under stucco — the plaster cracked during a move in 1955 and the gold looked out. Wat Mangkon Kamalawat (1871), the largest Chinese temple in the city, anchors the Teochew religious calendar; during the vegetarian festival the whole of Yaowarat goes yellow-flagged and meatless. The Odeon Gate, raised in 1999 for the King's sixth-cycle birthday, closes the boulevard's eastern end like a punctuation mark.",
            "The register's entries here are mostly not temples but shophouse runs — Sampheng lane itself, Ratchawong, Song Wat, Yaowarat — protecting the fabric of the trade rather than any single building, which is the honest way to protect a market quarter.",
        ],
        "monuments": ["fad-5387", "fad-5531", "fad-5648", "fad-5647"],
        "walks": ["talad-noi-songwad"],
    },
    {
        "slug": "sam-phraeng",
        "name": "Sam Phraeng",
        "thai": "สามแพร่ง",
        "district": "พระนคร",
        "tagline": "Three princes' palaces turned into the old town's gentlest shophouse lanes.",
        "center": [100.4980, 13.7520],
        "zoom": 15.8,
        "photo": "sam-phraeng",
        "prose": [
            "The three 'Phraeng' lanes — Phraeng Phuthon, Phraeng Nara, Phraeng Sanphasat — were each a prince's palace in the reign of Rama V. As the princes died or moved, the crown cut lanes through the compounds and lined them with two-storey shophouses in the European manner of the early 1900s. The result is the quietest heritage fabric in the old town: three parallel worlds a block apart, still low, still stuccoed, still trading.",
            "Phraeng Phuthon keeps a square at its heart — the shophouses face inward onto what was the palace forecourt, now a car park by day and a food yard by evening, ringed by third-generation eateries. Phraeng Nara, named for the playwright-prince Naret Worarit, held Thailand's first private theatre inside the palace. Of Phraeng Sanphasat, the palace gate alone survives — a stucco arch the register lists as monument fad-25 — standing mid-lane like a stage set that lost its theatre.",
            "The register protects the shophouse runs of all three lanes. Eat where the queue is; every third shopfront here has been serving the same dish for fifty years.",
        ],
        "monuments": ["fad-25", "fad-55", "fad-49", "fad-40"],
        "walks": ["sam-phraeng-lanes"],
    },
    {
        "slug": "nang-loeng",
        "name": "Nang Loeng",
        "thai": "นางเลิ้ง",
        "district": "ป้อมปราบศัตรูพ่าย",
        "tagline": "Bangkok's first land market, 1899 — wooden shophouses, likay and a sleeping cinema.",
        "center": [100.5118, 13.7590],
        "zoom": 15.8,
        "photo": "nang-loeng",
        "prose": [
            "Nang Loeng opened in 1899 as Bangkok's first purpose-built land market — until then serious commerce happened on water. Rama V opened it in person; the wooden shophouses around the market yard are among the last of their kind in the city, and the register protects the whole ensemble (ตลาดและตึกแถวบริเวณถนนนางเลิ้ง) as one monument.",
            "This was the entertainment quarter of early Ratanakosin modernity: dance troupes, likay theatre and, from 1918, the Chalermthani — a wooden cinema that ran films for seventy-five years before closing in 1993 and now stands restored inside the market block, one of the last wooden picture-houses in Southeast Asia. The lanes around it still house theatrical families; Baan Nara Sin, the costume house that dresses classical dance productions across the country, works a few doors from the market.",
            "Come hungry. The market's food row — kanom Thai, stewed pork leg, the famous Nang Loeng curry shops — is the least changed eating street in central Bangkok, and the vendors' families mostly predate the register itself.",
        ],
        "monuments": ["fad-5536", "fad-5538", "fad-5540", "fad-5411"],
        "walks": ["nang-loeng-market"],
    },
    {
        "slug": "charoen-krung",
        "name": "Charoen Krung & Bang Rak",
        "thai": "เจริญกรุง–บางรัก",
        "district": "บางรัก",
        "tagline": "The first paved road, 1864 — cathedrals, customs, and the creative district.",
        "center": [100.5142, 13.7255],
        "zoom": 15.2,
        "photo": "charoen-krung",
        "prose": [
            "Charoen Krung — 'prosper the city', though the foreigners just called it New Road — was Siam's first paved, Western-engineered street, finished in 1864 because the European consuls petitioned Rama IV that they were ill from having nowhere to ride. It became the axis of farang Bangkok: consulates, trading houses, hotels and churches strung between the road and their private river jetties.",
            "The heritage here is the architecture of trade and treaty. Assumption Cathedral, rebuilt 1909–1918 in red brick, seats the Catholic archdiocese behind the Oriental's back lanes. The East Asiatic Company's 1901 headquarters and the old Customs House of 1888 — Joachim Grassi's grand riverfront ruin, for decades a fire station — face the water they taxed. The Portuguese Embassy has held its ground since 1860, the oldest foreign mission in the country. And the 1940 General Post Office, a monumental Art Deco slab on the road itself, now houses the Thailand Creative & Design Centre — the anchor tenant of the 'Creative District' that has refilled the quarter's warehouses with studios and galleries since the 2010s.",
            "One block east of the cathedral, the lanes of the Haroon Mosque community — Javanese-descended, Muslim, riverside — have been serving oxtail soup in the shadow of the GPO for a century, which is Bang Rak's whole story: every faith and flag of the treaty port, still on speaking terms.",
        ],
        "monuments": ["fad-106", "fad-5487", "fad-8878"],
        "walks": ["charoen-krung-creative"],
    },
    {
        "slug": "bang-krachao",
        "name": "Bang Krachao",
        "thai": "บางกะเจ้า",
        "district": "พระประแดง (สมุทรปราการ)",
        "tagline": "The green lung — a river-ringed jungle of orchards, stilt paths and temple crafts.",
        "center": [100.5660, 13.6930],
        "zoom": 13.6,
        "photo": "bang-krachao",
        "prose": [
            "The Chao Phraya makes one last extravagant loop before the sea, and inside the loop is Bang Krachao: sixteen square kilometres of orchard, nipa palm and swamp forest that development never crossed the river to reach. Administratively it is Phra Pradaeng district of Samut Prakan, not Bangkok at all — but it is Bangkok's green lung, the wall of trees every high-rise west window looks onto, and TIME called it the best urban oasis in Asia in 2006.",
            "It stayed green by law and by luck: a 1977 cabinet ruling froze most of it against development, and the mainland's bridges never came. The crossing is still a long-tail ferry from Khlong Toei — two minutes and a few baht from the port's container cranes to a jetty under coconut palms. From there the quarter is best moved through by bicycle, on a network of elevated concrete paths a metre wide, threading between fish ponds and under fruit trees at handlebar height.",
            "Sri Nakhon Khuean Khan park keeps the core as botanical wetland with a birding tower; the Bang Nam Phueng weekend market feeds the whole island from boats and orchard stalls; and at Wat Chak Daeng the monks run Thailand's best-known temple recycling programme, spinning donated plastic bottles into saffron robes. Nothing here is on the Fine Arts register — Bang Krachao's heritage is the landscape itself, which no gazette volume knows how to hold.",
        ],
        "monuments": [],
        "walks": ["bang-krachao-loop"],
    },
]

# --------------------------------------------------------------------------
# THE SEVEN WALKS
#
# Each stop: name, thai, one of (fad / osm key / hand key), and a note —
# what you are looking at when you stand there. Modes: walk | bike.

WALKS = [
    {
        "slug": "six-faiths",
        "name": "Six Faiths of Kudi Chin",
        "thai": "หกศาสนสถานย่านกะดีจีน",
        "mode": "walk",
        "areas": ["kudi-chin"],
        "pattern": "Sacred sites",
        "intro": (
            "The shortest walk here and the densest: four religions in under two "
            "kilometres of Thonburi riverbank, every congregation still active. "
            "Start from Itsaraphap MRT or the river pier at Wat Kalayanamit; end "
            "on the white mountain of Wat Prayoon by Memorial Bridge."
        ),
        "stops": [
            {"name": "Wat Kalayanamit", "thai": "วัดกัลยาณมิตร", "fad": "fad-130",
             "note": "Rama III-era royal temple; the viharn was built around its 15-metre seated Buddha, Luang Pho To, patron of safe voyages — Chinese junk crews prayed here before sailing."},
            {"name": "Kian Un Keng Shrine", "thai": "ศาลเจ้าเกียนอันเกง", "hand": "kian-un-keng",
             "note": "A Hokkien Guanyin shrine older than the Chakri dynasty, kept by descendants of the community that arrived with King Taksin. The carved roof timbers are original."},
            {"name": "Santa Cruz Church", "thai": "วัดซางตาครู้ส", "fad": "fad-5429",
             "note": "The Portuguese church of 1770; the present terracotta dome is Rigotti and Tamagno's third building, 1916. The lanes behind still bake the Portuguese kudi chin cake over charcoal."},
            {"name": "Baan Kudichin Museum", "thai": "พิพิธภัณฑ์บ้านกุฎีจีน", "poi": "พิพิธภัณฑ์บ้านกุฎีจีน",
             "note": "A family house turned museum of the Siamese-Portuguese story — three small floors, the cake downstairs, run by the descendants themselves."},
            {"name": "Bang Luang Mosque (Kudi Khao)", "thai": "มัสยิดบางหลวง (กุฎีขาว)", "fad": "fad-8877",
             "note": "The White Mosque — built in the reign of Rama I by Ayutthaya-descended Muslims as a Thai temple hall with a mihrab; the only mosque in this form anywhere."},
            {"name": "Wat Prayurawongsawat", "thai": "วัดประยุรวงศาวาส", "osm": "wat-prayoon",
             "note": "The Bunnag family temple of 1828. Its white mountain-chedi's restoration took UNESCO's top Asia-Pacific conservation award in 2013; the turtle pond below is an artificial sacred mountain, Khao Mo."},
        ],
    },
    {
        "slug": "talad-noi-songwad",
        "name": "Talad Noi & Song Wat",
        "thai": "ตลาดน้อย–ทรงวาด",
        "mode": "walk",
        "areas": ["talad-noi", "songwad", "yaowarat-sampheng"],
        "pattern": "Trading quarter",
        "intro": (
            "The working edge of Chinese Bangkok, from the Golden Buddha to the "
            "rice godowns — shrines, one Hokkien mansion, a Gothic church and "
            "the wholesale lanes still doing what they were built for. Start at "
            "Hua Lamphong MRT; finish at Ratchawong pier for the boat out."
        ),
        "stops": [
            {"name": "Wat Traimit", "thai": "วัดไตรมิตรวิทยาราม", "fad": "fad-5387",
             "note": "The Golden Buddha: 5.5 tonnes of solid Sukhothai gold, hidden under stucco for two centuries until the plaster cracked in a 1955 move."},
            {"name": "Chow Sue Kong Shrine", "thai": "ศาลเจ้าโจวซือกง", "poi": "ศาลเจ้าโจวซือกง",
             "note": "Founded 1804; one of the oldest Hokkien shrines in Thailand, dedicated to a Song-dynasty healer monk. The quarter's vegetarian festival radiates from here."},
            {"name": "So Heng Tai Mansion", "thai": "บ้านโซวเฮงไถ่", "poi": "โซวเฮงไถ่",
             "note": "A 1790s four-wing Fujian courtyard house, home to the same family for eight generations — the courtyard now holds a freediving pool, and the carpentry has never needed replacing."},
            {"name": "Hong Sieng Kong", "thai": "ฮงเซียงกง", "poi": "ฮงเซียงกง",
             "note": "A restored riverside godown compound — Chinese roof tiles, banyan roots and the river terrace that shows exactly what the whole bank looked like when cargo still landed here."},
            {"name": "Holy Rosary Church", "thai": "วัดแม่พระลูกประคำ (กาลหว่าร์)", "fad": "fad-5650",
             "note": "Kalawar, from the Portuguese Calvário — land granted to Portuguese Catholics in 1787, the present Gothic Revival church from the 1890s. Its Black Christ figure is carried through the quarter every Good Friday."},
            {"name": "Siam Commercial Bank, Talad Noi", "thai": "ธนาคารไทยพาณิชย์ สาขาตลาดน้อย", "fad": "fad-5649",
             "note": "The 1910 Beaux-Arts first head office of Thailand's first commercial bank — still a working branch, original brass tellers' grilles intact."},
            {"name": "Wat Pathum Khongkha", "thai": "วัดปทุมคงคา", "fad": "fad-5651",
             "note": "An Ayutthaya-period temple predating the city itself, rebuilt by Rama I's brother; in the early Bangkok era its river landing was where royal criminal sentences were carried out."},
            {"name": "Poey Eng School", "thai": "โรงเรียนเผยอิง", "poi": "โรงเรียนเผยอิง",
             "note": "The Teochew community's school of 1920, fronted like a small Chinese civic palace — the confident public face of the merchant quarter that funded it."},
            {"name": "Lao Pun Tao Kong Shrine", "thai": "ศาลเจ้าเล่าปูนเถ้ากง", "poi": "เล่าปูนเถ้ากง",
             "note": "The Teochew ancestral shrine of Song Wat, guarding the road the King drew; the shophouse run either side is register monument fad-5646."},
            {"name": "Sampheng Lane", "thai": "สำเพ็ง (ซอยวานิช 1)", "fad": "fad-5648",
             "note": "The original 1782 Chinese lane, two metres wide and a kilometre long — the register protects the shophouses; the trade protects itself."},
        ],
    },
    {
        "slug": "royal-axis",
        "name": "The Royal Axis",
        "thai": "แกนพระนคร",
        "mode": "walk",
        "areas": ["rattanakosin"],
        "pattern": "Royal quarter",
        "intro": (
            "The founding axis of Bangkok, south to north: from the Reclining "
            "Buddha past the palace wall, across the royal field, and up the "
            "river road to the last northern fort. Four kilometres through the "
            "densest register fabric in the country. Go at seven in the morning "
            "and the island is yours."
        ),
        "stops": [
            {"name": "Wat Pho", "thai": "วัดพระเชตุพนวิมลมังคลาราม", "fad": "fad-71",
             "note": "The 46-metre Reclining Buddha, 91 chedis, and the marble plaques of medicine and massage that made this Thailand's first open university — UNESCO Memory of the World."},
            {"name": "Grand Palace & Wat Phra Kaeo", "thai": "พระบรมมหาราชวัง", "poi": "พระบรมมหาราชวัง",
             "note": "The 1782 palace of the dynasty and the Emerald Buddha's chapel — a square kilometre of gold behind two kilometres of white crenellated wall."},
            {"name": "City Pillar Shrine", "thai": "ศาลหลักเมือง", "fad": "fad-12",
             "note": "The wooden pillar Rama I raised on 21 April 1782, 6:54 a.m. — the city's astrological birth certificate. Every Bangkok horoscope starts from this spot."},
            {"name": "Sanam Luang", "thai": "ท้องสนามหลวง", "hand": "sanam-luang",
             "note": "The royal field: cremation ground of kings, kite field of commoners, and the open lung the palace was designed to be seen across."},
            {"name": "Wat Mahathat", "thai": "วัดมหาธาตุยุวราชรังสฤษฎิ์", "fad": "fad-62",
             "note": "Older than the capital around it; seat of the Maha Nikaya order and of vipassana meditation teaching in Bangkok. The amulet market runs along its wall."},
            {"name": "National Museum (Wang Na)", "thai": "พิพิธภัณฑสถานแห่งชาติ พระนคร", "poi": "พิพิธภัณฑสถานแห่งชาติ พระนคร",
             "note": "The Front Palace of the deputy kings, made the national museum in 1887 — the buildings are the biggest exhibit, and the Buddhaisawan Chapel's murals the finest of their century."},
            {"name": "Phra Athit shophouses", "thai": "ตึกแถวถนนพระอาทิตย์", "fad": "fad-5554",
             "coord": [100.4927, 13.7617],
             "approx_why": "register row fad-5554 is unpinned; placed mid-run on Phra Athit Road",
             "note": "The river road of minor palaces and 1900s shophouses, now cafés facing the water — the register protects the run as one monument."},
            {"name": "Phra Sumen Fort", "thai": "ป้อมพระสุเมรุ", "fad": "fad-65",
             "note": "One of two survivors of the fourteen forts of 1783, holding the island's northern point over Santichaiprakan park — finish here at sunset over the river."},
        ],
    },
    {
        "slug": "sam-phraeng-lanes",
        "name": "Sam Phraeng & the Old Town Lanes",
        "thai": "สามแพร่งและตรอกเมืองเก่า",
        "mode": "walk",
        "areas": ["sam-phraeng", "rattanakosin"],
        "pattern": "Backstreet lanes",
        "intro": (
            "The domestic old town — not the palaces but the lanes between "
            "them: three princes' compounds turned shophouse quarters, two of "
            "the most beautiful small royal temples, and the street of Brahmin "
            "rites. Short, flat, and best walked hungry."
        ),
        "stops": [
            {"name": "Giant Swing", "thai": "เสาชิงช้า", "fad": "fad-3",
             "note": "The 21-metre teak frame of the Brahmin swinging ceremony, raised 1784 and last swung 1935 — men once rode it 25 metres up to snatch a bag of silver with their teeth."},
            {"name": "Wat Suthat", "thai": "วัดสุทัศน์เทพวราราม", "fad": "fad-5",
             "note": "Three reigns in the building; the 8-metre Phra Si Sakyamuni was floated whole down from Sukhothai in 1808. The viharn's murals are the deepest in Bangkok."},
            {"name": "Devasathan (Brahmin Temple)", "thai": "เทวสถานโบสถ์พราหมณ์", "fad": "fad-1",
             "note": "The working Brahmin temple of the court since 1784 — the priests here still perform the royal ceremonies, in Sanskrit, as their families have for forty generations."},
            {"name": "Bamrung Mueang shophouses", "thai": "ตึกแถวถนนบำรุงเมือง", "fad": "fad-5604",
             "note": "The monk-supply street: an unbroken register-listed run of 1900s shophouses selling robes, alms bowls and Buddha images at every scale up to building-height."},
            {"name": "Phraeng Sanphasat Gate", "thai": "ซุ้มประตูวังสรรพศาสตร์", "fad": "fad-25",
             "note": "All that stands of Prince Sanphasat's palace — a stucco arch mid-lane, register monument fad-25, a stage set that outlived its theatre."},
            {"name": "Phraeng Phuthon Square", "thai": "แพร่งภูธร", "poi": "แพร่งภูธร",
             "note": "The palace forecourt turned town square, ringed by 1900s shophouses and third-generation eateries — the old town's gentlest room."},
            {"name": "Wat Ratchabophit", "thai": "วัดราชบพิธสถิตมหาสีมาราม", "fad": "fad-7",
             "note": "Rama V's temple of 1869: Thai outside, Gothic inside, mother-of-pearl doors — and the royal cemetery behind, a garden of miniature European chapels for the King's family."},
            {"name": "Wat Ratchapradit", "thai": "วัดราชประดิษฐสถิตมหาสีมาราม", "fad": "fad-6",
             "note": "Rama IV's tiny grey-marble royal temple of 1864, built for the Thammayut order he founded — the most complete small temple of its century, murals of the 1868 eclipse included."},
        ],
    },
    {
        "slug": "charoen-krung-creative",
        "name": "Charoen Krung Creative Mile",
        "thai": "เจริญกรุงสายสร้างสรรค์",
        "mode": "walk",
        "areas": ["charoen-krung", "talad-noi"],
        "pattern": "Treaty port to creative district",
        "intro": (
            "The farang mile of the treaty port, walked north: cathedral, "
            "trading houses, customs, mosque lane, post office, warehouses — "
            "ending where Bang Rak dissolves into Talad Noi. The architecture "
            "of every flag that traded here, now the spine of the Creative "
            "District. Start from Saphan Taksin BTS via the Oriental lane."
        ),
        "stops": [
            {"name": "Assumption Cathedral", "thai": "อาสนวิหารอัสสัมชัญ", "fad": "fad-5487",
             "note": "The Catholic archcathedral, rebuilt in red brick 1909–1918 behind the Oriental — Romanesque outside, gilded rib-vaults inside."},
            {"name": "East Asiatic Building", "thai": "อาคารอีสท์เอเชียติก", "osm-extra": "east-asiatic",
             "note": "The Danish trading company's 1901 riverfront headquarters, Venetian in dress — the EAC's teak and shipping empire ran from this block."},
            {"name": "Old Customs House", "thai": "ศุลกสถาน", "fad": "fad-106", "poi": "ศุลกสถาน",
             "note": "Joachim Grassi's 1888 customs palace, where every ship entering Siam paid its duty; a fire station for eighty years, now under restoration. The most photogenic decay on the river."},
            {"name": "Haroon Mosque", "thai": "มัสยิดฮารูณ", "poi": "มัสยิดฮารูณ",
             "note": "The Javanese-descended riverside community, here since the 1820s — a village of wooden lanes and oxtail soup one block from the embassies."},
            {"name": "Portuguese Embassy", "thai": "สถานทูตโปรตุเกส", "osm": "portuguese-embassy",
             "note": "The oldest foreign mission in Thailand — the residence has stood on this river grant since 1860, a memory of the first treaty power."},
            {"name": "General Post Office (TCDC)", "thai": "ไปรษณีย์กลาง", "fad": "fad-8878", "poi": "ไปรษณีย์กลาง",
             "note": "The 1940 Art Deco monolith of the postal service, garuda-crowned; since 2017 the Thailand Creative & Design Centre — the creative district's official anchor."},
            {"name": "Warehouse 30", "thai": "โกดังเลขที่ 30", "hand": "warehouse-30",
             "note": "A row of 1940s riverside godowns converted to studios, cinema and shops — the model conversion that set the quarter's tone."},
            {"name": "So Heng Tai Mansion", "thai": "บ้านโซวเฮงไถ่ (ตลาดน้อย)", "poi": "โซวเฮงไถ่",
             "note": "Cross into Talad Noi to finish at the 1790s Hokkien courtyard mansion — where the treaty port hands back to the Chinese city that preceded it."},
        ],
    },
    {
        "slug": "nang-loeng-market",
        "name": "Nang Loeng Market & Theatre Quarter",
        "thai": "ตลาดนางเลิ้งและย่านโรงละคร",
        "mode": "walk",
        "areas": ["nang-loeng"],
        "pattern": "Market & performance",
        "intro": (
            "The shortest walk in the set and the best fed: Bangkok's first "
            "land market, its wooden cinema, and the temple of the quarter, "
            "all within six hundred metres. Go before noon — the market's "
            "third-generation food row sells out early."
        ),
        "stops": [
            {"name": "Nang Loeng Market", "thai": "ตลาดนางเลิ้ง", "fad": "fad-5536", "poi": "ตลาดนางเลิ้ง",
             "note": "Opened by Rama V in 1899 as the city's first purpose-built land market; the wooden shophouse ensemble around the yard is register-protected as a single monument."},
            {"name": "Chalermthani Cinema", "thai": "โรงภาพยนตร์เฉลิมธานี", "hand": "chalermthani",
             "note": "A wooden picture-house of 1918 that ran for seventy-five years — one of the last of its kind in Southeast Asia, restored inside the market block. Register row fad-5538."},
            {"name": "Wat Sunthon Thammathan", "thai": "วัดสุนทรธรรมทาน (วัดแคนางเลิ้ง)", "coord": [100.5107, 13.7576],
             "approx_why": "community temple of the quarter; placed from its street block",
             "note": "The community temple of the likay and dance families — the quarter's performers still make offerings here before a season opens."},
            {"name": "Wat Sommanat", "thai": "วัดโสมนัสวิหาร", "fad": "fad-5540",
             "note": "Rama IV's 1853 memorial temple for Queen Sommanat, moated like a miniature city — its Khrua In Khong murals paint Buddhist allegory as 19th-century America, complete with steamships."},
        ],
    },
    {
        "slug": "bang-krachao-loop",
        "name": "Bang Krachao Green Loop",
        "thai": "วงรอบบางกะเจ้า",
        "mode": "bike",
        "areas": ["bang-krachao"],
        "pattern": "Green lung by bicycle",
        "intro": (
            "The one route here that wants a bicycle — rent one at the pier "
            "for a few baht. A long-tail ferry from Khlong Toei crosses to "
            "the green lung in two minutes; the loop then rides elevated "
            "concrete paths through nipa palm and orchard, past the botanical "
            "park, the weekend floating market and the temple that turns "
            "plastic bottles into monks' robes. Flat, shaded, unforgettable."
        ),
        "stops": [
            {"name": "Bang Krachao Pier", "thai": "ท่าเรือบางกะเจ้า", "osm": "bang-krachao-pier",
             "note": "The landing of the long-tail crossing from Khlong Toei — container cranes behind you, coconut palms in front. Bike rental is at the top of the ramp."},
            {"name": "Sri Nakhon Khuean Khan Park", "thai": "สวนศรีนครเขื่อนขันธ์", "poi": "สวนศรีนครเขื่อนขันธ์",
             "note": "The protected core of the lung: botanical wetland, a lake of monitor lizards, and a birding tower over the canopy. The 1977 cabinet ruling that froze development is why any of this exists."},
            {"name": "Bang Nam Phueng Floating Market", "thai": "ตลาดน้ำบางน้ำผึ้ง", "poi": "ตลาดน้ำบางน้ำผึ้ง",
             "note": "The weekend market that feeds the island — orchard fruit, canal-side noodles and herbs you will not see in town. Saturday and Sunday mornings only."},
            {"name": "Wat Chak Daeng", "thai": "วัดจากแดง", "osm": "wat-chak-daeng",
             "note": "The recycling temple: monks and volunteers spin donated plastic bottles into thread and weave it into saffron robes — about sixty bottles per robe. Finish here and ferry back from the nearest pier, or ride the loop home."},
        ],
    },
]

# --------------------------------------------------------------------------


def load_register() -> tuple[dict, dict]:
    data = json.loads(REGISTER.read_text(encoding="utf-8"))
    return {s["id"]: s for s in data["sites"]}, data["worlds"]


def load_poi() -> dict:
    return json.loads(POI.read_text(encoding="utf-8")) if POI.exists() else {}


def resolve_stop(stop: dict, register: dict, poi: dict) -> dict:
    out = {"name": stop["name"], "thai": stop.get("thai", ""), "note": stop["note"]}
    if "fad" in stop:
        site = register.get(stop["fad"])
        if site and site.get("lat"):
            out.update(lat=site["lat"], lon=site["lon"], fad=stop["fad"],
                       registered=site["registered"], locatedBy="register")
            if site.get("block"):
                out["block"] = site["block"]
                out["world"] = site["world"]
                # The worlds are superflat; spawnY is the real ground height,
                # read from level.dat by the register build. Hardcoding -50
                # here would drop Ratchathewi arrivals nine blocks short.
                y = (WORLDS.get(site["world"]) or {}).get("spawnY", -50)
                out["tp"] = f"/tp @s {site['block']['x']} {y} {site['block']['z']}"
            return out
        # Register row exists but is unpinned — fall through only if another
        # source is given; otherwise this is a build error worth failing on.
        if not any(k in stop for k in ("osm", "poi", "hand", "coord", "osm-extra")):
            raise SystemExit(f"stop '{stop['name']}' cites unpinned {stop['fad']} with no fallback")
        out["fad"] = stop["fad"]
        out["registered"] = bool(site and site.get("registered"))
    if "osm" in stop:
        lat, lon, ref = OSM_EXTRA[stop["osm"]]
        out.update(lat=lat, lon=lon, locatedBy=f"osm:{ref}")
        return out
    if "osm-extra" in stop and stop["osm-extra"] == "east-asiatic":
        out.update(lat=13.723265, lon=100.514094, locatedBy="osm:way/east-asiatic")
        return out
    if "poi" in stop:
        hit = poi.get(stop["poi"])
        if not hit:
            raise SystemExit(f"stop '{stop['name']}' needs POI '{stop['poi']}' — rerun the resolver")
        out.update(lat=hit["lat"], lon=hit["lon"], locatedBy=f"osm:{hit['osm']}")
        return out
    if "hand" in stop:
        h = HAND[stop["hand"]]
        out.update(lat=h["lat"], lon=h["lon"], locatedBy="hand", approx=True,
                   approxWhy=h["why"])
        return out
    if "coord" in stop:
        out.update(lat=stop["coord"][1], lon=stop["coord"][0], locatedBy="hand",
                   approx=True, approxWhy=stop.get("approx_why", "hand-placed"))
        return out
    raise SystemExit(f"stop '{stop['name']}' has no location source")


def fetch_route(coords: list[tuple[float, float]], slug: str, reroute: bool) -> dict | None:
    """Street-following walking line through every stop, cached."""
    CACHE.mkdir(parents=True, exist_ok=True)
    cache = CACHE / f"route-{slug}.json"
    if cache.exists() and not reroute:
        return json.loads(cache.read_text())
    path = ";".join(f"{lon},{lat}" for lat, lon in coords)
    url = f"{OSRM}{path}?overview=full&geometries=geojson&steps=false"
    try:
        # python-urllib's TLS handshake is rejected by this router on macOS;
        # curl negotiates fine, so shell out to it.
        import subprocess
        raw = subprocess.run(["curl", "-s", "--max-time", "90", "-A", UA, url],
                             capture_output=True, check=True).stdout
        data = json.loads(raw)
        if data.get("code") != "Ok":
            raise ValueError(data.get("code"))
        route = data["routes"][0]
        result = {
            "distanceM": round(route["distance"]),
            "durationMin": round(route["duration"] / 60),
            "line": [[round(lon, 6), round(lat, 6)] for lon, lat in route["geometry"]["coordinates"]],
        }
        cache.write_text(json.dumps(result))
        return result
    except Exception as err:
        print(f"  WARN: routing failed for {slug} ({err}) — walk ships without a line",
              file=sys.stderr)
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reroute", action="store_true")
    args = ap.parse_args()

    global WORLDS
    register, WORLDS = load_register()
    poi = load_poi()

    walks_out, geom_out = [], {}
    for walk in WALKS:
        stops = [resolve_stop(s, register, poi) for s in walk["stops"]]
        route = fetch_route([(s["lat"], s["lon"]) for s in stops], walk["slug"], args.reroute)
        entry = {
            "slug": walk["slug"], "name": walk["name"], "thai": walk["thai"],
            "mode": walk["mode"], "pattern": walk["pattern"],
            "areas": walk["areas"], "intro": walk["intro"], "stops": stops,
        }
        if route:
            entry["distanceM"] = route["distanceM"]
            entry["durationMin"] = route["durationMin"]
            geom_out[walk["slug"]] = {
                "line": route["line"],
                "stops": [[s["lon"], s["lat"]] for s in stops],
            }
        walks_out.append(entry)
        km = f"{route['distanceM']/1000:.1f} km" if route else "no route line"
        print(f"  {walk['slug']:24} {len(stops)} stops · {km}", file=sys.stderr)

    # Areas: verify every cited monument exists in the register.
    areas_out = []
    for area in AREAS:
        monuments = []
        for fid in area["monuments"]:
            site = register.get(fid)
            if not site:
                raise SystemExit(f"area {area['slug']} cites unknown register id {fid}")
            monuments.append({
                "fad": fid, "name": site["name"], "registered": site["registered"],
                **({"lat": site["lat"], "lon": site["lon"]} if site.get("lat") else {}),
            })
        areas_out.append({**{k: area[k] for k in
                             ("slug", "name", "thai", "district", "tagline",
                              "center", "zoom", "photo", "prose", "walks")},
                          "monuments": monuments})

    OUT_DATA.parent.mkdir(parents=True, exist_ok=True)
    OUT_DATA.write_text(json.dumps(
        {"areas": areas_out, "walks": walks_out},
        ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    OUT_GEOM.write_text(json.dumps(geom_out, separators=(",", ":")), encoding="utf-8")

    print(f"wrote {OUT_DATA.relative_to(ROOT)} ({OUT_DATA.stat().st_size//1024} KB)",
          file=sys.stderr)
    print(f"wrote {OUT_GEOM.relative_to(ROOT)} ({OUT_GEOM.stat().st_size//1024} KB)",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
