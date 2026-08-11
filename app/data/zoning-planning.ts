export interface GeoPolygonFeature {
  type: "Feature";
  properties: {
    id: string;
    code: string;
    name: string;
    thai: string;
    category: "Conservation" | "Canal" | "Boulevard";
    description: string;
    fillColor: string;
    strokeColor: string;
    opacity: number;
  };
  geometry: {
    type: "Polygon" | "LineString";
    coordinates: number[][][] | number[][];
  };
}

export interface GeoJsonCollection {
  type: "FeatureCollection";
  features: GeoPolygonFeature[];
}

export const BKK_URBAN_ZONING_NOTE =
  "Illustrative Rattanakosin heritage context for orientation only. These hand-curated shapes are not BMA statutory planning polygons and must not be used for regulatory, height-control, or development decisions.";

export const BKK_URBAN_ZONING_GEOJSON: GeoJsonCollection = {
  type: "FeatureCollection",
  features: [
    // Rattanakosin Inner Island (เกาะรัตนโกสินทร์ชั้นใน) - Zone ศ.๑
    {
      type: "Feature",
      properties: {
        id: "zone-rattanakosin-inner",
        code: "ศ.๑-๑",
        name: "Inner Rattanakosin Heritage Conservation Area",
        thai: "บริเวณอนุรักษ์ศิลปวัฒนธรรมไทย เกาะรัตนโกสินทร์ชั้นใน",
        category: "Conservation",
        description: "Illustrative inner Rattanakosin heritage context, bounded by the Chao Phraya River and Khlong Khu Mueang Doem (Khlong Lord). Not a statutory planning boundary.",
        fillColor: "#c98a3b",
        strokeColor: "#ffc168",
        opacity: 0.22,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [100.4890, 13.7600],
            [100.4932, 13.7628],
            [100.4965, 13.7592],
            [100.4983, 13.7540],
            [100.4988, 13.7485],
            [100.4960, 13.7420],
            [100.4935, 13.7410],
            [100.4880, 13.7470],
            [100.4870, 13.7535],
            [100.4890, 13.7600],
          ],
        ],
      },
    },
    // Rattanakosin Outer Island (เกาะรัตนโกสินทร์ชั้นนอก) - Zone ศ.๑-๒
    {
      type: "Feature",
      properties: {
        id: "zone-rattanakosin-outer",
        code: "ศ.๑-๒",
        name: "Outer Rattanakosin Heritage Conservation Area",
        thai: "บริเวณอนุรักษ์ศิลปวัฒนธรรมไทย เกาะรัตนโกสินทร์ชั้นนอก",
        category: "Conservation",
        description: "Illustrative outer Rattanakosin heritage context between Khlong Lord and Khlong Rop Krung (Ong Ang / Bang Lamphu). Not a statutory planning boundary.",
        fillColor: "#9c7042",
        strokeColor: "#e6b074",
        opacity: 0.16,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [100.4932, 13.7628],
            [100.4962, 13.7650],
            [100.5030, 13.7620],
            [100.5065, 13.7565],
            [100.5050, 13.7490],
            [100.5010, 13.7410],
            [100.4960, 13.7420],
            [100.4988, 13.7485],
            [100.4983, 13.7540],
            [100.4965, 13.7592],
            [100.4932, 13.7628],
          ],
        ],
      },
    },
    // Khlong Khu Mueang Doem (Khlong Lord / Inner Canal Moat 1782)
    {
      type: "Feature",
      properties: {
        id: "canal-khlong-lord",
        code: "WTR-01",
        name: "Khlong Khu Mueang Doem (Khlong Lord)",
        thai: "คลองคูเมืองเดิม (คลองหลอด)",
        category: "Canal",
        description: "The original 1782 Ayutthaya-era defensive city moat forming the eastern boundary of Inner Rattanakosin.",
        fillColor: "#2da8d6",
        strokeColor: "#40d2ff",
        opacity: 0.85,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [100.4938, 13.7608],
          [100.4958, 13.7585],
          [100.4975, 13.7538],
          [100.4982, 13.7488],
          [100.4955, 13.7428],
        ],
      },
    },
    // Khlong Rop Krung / Ong Ang / Bang Lamphu (Outer Canal Moat 1783)
    {
      type: "Feature",
      properties: {
        id: "canal-khlong-rop-krung",
        code: "WTR-02",
        name: "Khlong Rop Krung (Bang Lamphu / Ong Ang)",
        thai: "คลองรอบกรุง (คลองบางลำพู - คลองโอ่งอ่าง)",
        category: "Canal",
        description: "Constructed in 1783 under King Rama I to expand the walled perimeter of Bangkok. Now an active urban cultural waterfront.",
        fillColor: "#2da8d6",
        strokeColor: "#40d2ff",
        opacity: 0.85,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [100.4956, 13.7638],
          [100.4998, 13.7628],
          [100.5052, 13.7558],
          [100.5038, 13.7482],
          [100.5005, 13.7420],
        ],
      },
    },
    // Ratchadamnoen Avenue Civic Boulevard
    {
      type: "Feature",
      properties: {
        id: "boulevard-ratchadamnoen",
        code: "BLVD-01",
        name: "Ratchadamnoen Royal & Civic Axis",
        thai: "ถนนราชดำเนิน",
        category: "Boulevard",
        description: "Modeled after European royal avenues by King Chulalongkorn (Rama V) in 1899, connecting the Grand Palace to Dusit Palace complex.",
        fillColor: "#e5ff54",
        strokeColor: "#c9ff38",
        opacity: 0.9,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [100.4925, 13.7562],
          [100.4975, 13.7565],
          [100.5018, 13.7567],
          [100.5050, 13.7554],
          [100.5098, 13.7612],
          [100.5122, 13.7688],
        ],
      },
    },
  ],
};
