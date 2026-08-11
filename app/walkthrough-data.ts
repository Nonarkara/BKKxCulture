// Shared world data for every BKKx view (2D walkthrough, 3D atlas, future
// per-district pages). Server-safe: no "use client" directive, no JSX,
// no browser-only APIs. Re-exported from the client walkthrough module
// for backwards compatibility.

export type Stop = {
  id: string;
  name: string;
  thai: string;
  chapter: string;
  description: string;
  signal: string;
  coordinates: string;
  x: number;
  y: number;
};

export type WorldId = "ratchathewi" | "historic-core";

export type World = {
  id: WorldId;
  number: string;
  name: string;
  thai: string;
  strapline: string;
  description: string;
  image: string;
  width: number;
  height: number;
  distance: string;
  regions: number;
  chunks: string;
  download: string;
  stops: Stop[];
};

export const REPOSITORY = "https://github.com/Nonarkara/BKKx";
export const RELEASE_BASE = `${REPOSITORY}/releases/latest/download`;

export const worlds: World[] = [
  {
    id: "ratchathewi",
    number: "01",
    name: "Ratchathewi",
    thai: "ราชเทวี",
    strapline: "Bangkok in motion",
    description:
      "Follow the rail lines, markets and superblocks that pull Bangkok toward Victory Monument, Pratunam and Makkasan.",
    image: "/images/ratchathewi.png",
    width: 4956,
    height: 2945,
    distance: "4.96 × 2.95 km",
    regions: 60,
    chunks: "61,440",
    download: `${RELEASE_BASE}/BKKx-Ratchathewi-Java-1.21.4.zip`,
    stops: [
      {
        id: "victory-monument",
        name: "Victory Monument",
        thai: "อนุสาวรีย์ชัยสมรภูมิ",
        chapter: "The city as a roundabout",
        description:
          "Bangkok's buses, vans and rail lines converge around a monument that behaves less like an object and more like a machine for moving people.",
        signal: "Begin above the traffic circle, then follow the BTS viaduct south.",
        coordinates: "13.7649° N · 100.5383° E",
        x: 42.0,
        y: 35.6,
      },
      {
        id: "phaya-thai",
        name: "Phaya Thai Station",
        thai: "สถานีพญาไท",
        chapter: "Two rail systems cross",
        description:
          "The BTS and Airport Rail Link meet here, turning a compact station into the district's gateway to both central Bangkok and Suvarnabhumi.",
        signal: "Trace the elevated tracks east toward Makkasan or west toward Siam.",
        coordinates: "13.7568° N · 100.5347° E",
        x: 34.1,
        y: 66.2,
      },
      {
        id: "baiyoke",
        name: "Baiyoke Tower II",
        thai: "ตึกใบหยก 2",
        chapter: "The vertical landmark",
        description:
          "A tower rising from Pratunam's dense market fabric. From street level, the district reads as alleys; from above, as a continuous commercial field.",
        signal: "Use the tower as your compass before dropping into the market lanes.",
        coordinates: "13.7547° N · 100.5401° E",
        x: 45.9,
        y: 74.1,
      },
      {
        id: "pratunam",
        name: "Pratunam Market",
        thai: "ตลาดประตูน้ำ",
        chapter: "Commerce at one-block scale",
        description:
          "Wholesale fashion, hotels, street food and narrow passages form a district that only makes sense when explored slowly and close to the ground.",
        signal: "Switch from flying to walking and read the grain of the smaller blocks.",
        coordinates: "13.7508° N · 100.5396° E",
        x: 44.8,
        y: 88.8,
      },
      {
        id: "makkasan",
        name: "Makkasan Station",
        thai: "สถานีมักกะสัน",
        chapter: "The eastern threshold",
        description:
          "Rail yards, expressways and the airport line open the dense district into a wide infrastructural landscape at Bangkok's eastern edge.",
        signal: "Fly east along the rail corridor to see the city change scale.",
        coordinates: "13.7512° N · 100.5614° E",
        x: 92.3,
        y: 87.4,
      },
    ],
  },
  {
    id: "historic-core",
    number: "02",
    name: "Historic Core",
    thai: "เกาะรัตนโกสินทร์",
    strapline: "River, ritual, memory",
    description:
      "Cross the Chao Phraya and read Bangkok's royal, civic and spiritual landmarks as one connected urban landscape.",
    image: "/images/historic-core.png",
    width: 3384,
    height: 3217,
    distance: "3.38 × 3.22 km",
    regions: 49,
    chunks: "50,176",
    download: `${RELEASE_BASE}/BKKx-Bangkok-Historic-Core-Java-1.21.4.zip`,
    stops: [
      {
        id: "grand-palace",
        name: "Grand Palace & Wat Phra Kaew",
        thai: "พระบรมมหาราชวังและวัดพระศรีรัตนศาสดาราม",
        chapter: "The royal core",
        description:
          "The palace compound reads as a dense city inside a city: gates, throne halls, gilded chedis and the sacred Emerald Buddha organized behind 1.9km of crenellated white walls.",
        signal: "Circle the perimeter first; enter the sacred precinct only after reading its full defensible scale.",
        coordinates: "13.7500° N · 100.4914° E",
        x: 39.8,
        y: 55.7,
      },
      {
        id: "sanam-luang",
        name: "Sanam Luang",
        thai: "สนามหลวง",
        chapter: "The ceremonial clearing",
        description:
          "An enormous open oval green interrupts the fine-grained old city and gives the surrounding royal temples, Supreme Court and palace gates room to breathe.",
        signal: "Climb high enough to see the field anchor the civic and royal geometry of the island.",
        coordinates: "13.7563° N · 100.4930° E",
        x: 45.0,
        y: 33.8,
      },
      {
        id: "front-palace",
        name: "Front Palace (Wang Na)",
        thai: "พระราชวังบวรสถานมงคล (วังหน้า)",
        chapter: "The viceroy's citadel",
        description:
          "Now the National Museum Bangkok, this northern palace complex housed the Vice-Kings of Siam with monumental wooden halls and 1795 Buddhaisawan murals.",
        signal: "Look for the red pavilion and cross-gabled roofs bordering Thammasat University.",
        coordinates: "13.7578° N · 100.4922° E",
        x: 42.4,
        y: 28.5,
      },
      {
        id: "phra-sumen-fort",
        name: "Phra Sumen Fort & Khlong Rop Krung",
        thai: "ป้อมพระสุเมรุและคลองรอบกรุง",
        chapter: "The northern water bastion",
        description:
          "An 18th-century octagonal brick bastion where the outer canal moat meets the river, anchoring the bohemian riverside neighborhood of Bang Lamphu.",
        signal: "Follow the canal mouth inward to trace the 1783 boundary moat of Bangkok.",
        coordinates: "13.7634° N · 100.4957° E",
        x: 53.6,
        y: 10.2,
      },
      {
        id: "democracy-monument",
        name: "Democracy Monument",
        thai: "อนุสาวรีย์ประชาธิปไตย",
        chapter: "The 1932 civic axis",
        description:
          "Ratchadamnoen Avenue frames a monument whose geometry, traffic and political history make it one of Bangkok's most charged public assembly spaces.",
        signal: "Start at the central pylon and follow the avenue west toward Sanam Luang.",
        coordinates: "13.7567° N · 100.5018° E",
        x: 73.1,
        y: 32.4,
      },
      {
        id: "giant-swing",
        name: "Giant Swing & Wat Suthat",
        thai: "เสาชิงช้าและวัดสุทัศนเทพวราราม",
        chapter: "The cosmic centre",
        description:
          "The 21-metre red teak swing and royal cloistered monastery mark the geometric centre of Bangkok's original 1782 Brahmin city planning.",
        signal: "Align your camera north through the swing pillars to frame the monastic roofline.",
        coordinates: "13.7518° N · 100.5015° E",
        x: 72.2,
        y: 49.6,
      },
      {
        id: "wat-pho",
        name: "Wat Pho Monastic Campus",
        thai: "วัดพระเชตุพนวิมลมังคลาราม",
        chapter: "Temple as a university",
        description:
          "Courtyards, 91 chedis and cloisters spread south of the palace, serving as Thailand's first public university and UNESCO repository of medical arts.",
        signal: "Walk the compound edges and compare their rhythm with the palace walls.",
        coordinates: "13.7465° N · 100.4930° E",
        x: 45.0,
        y: 67.6,
      },
      {
        id: "tha-tien",
        name: "Tha Tien Heritage Quarter",
        thai: "ย่านประวัติศาสตร์ท่าเตียน",
        chapter: "The riverine market",
        description:
          "Colonial-era row shophouses, wholesale dried seafood traders and ferry piers form the dense mercantile threshold between river and palace.",
        signal: "Watch the cross-river commuter ferries maneuver across the Chao Phraya current.",
        coordinates: "13.7461° N · 100.4898° E",
        x: 34.8,
        y: 69.1,
      },
      {
        id: "wat-arun",
        name: "Wat Arun Prang Horizon",
        thai: "วัดอรุณราชวราราม (พระปรางค์)",
        chapter: "The river crossing",
        description:
          "The temple's central prang marks the Thonburi bank and turns the Chao Phraya from a defensive moat into the monumental open room of the capital.",
        signal: "Cross the river at low altitude; the changing skyline silhouette is the point.",
        coordinates: "13.7437° N · 100.4889° E",
        x: 31.9,
        y: 77.3,
      },
    ],
  },
];
