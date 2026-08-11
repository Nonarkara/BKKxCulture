// Short, mechanical UI chrome strings — hand-translated, not swarm-translated
// (the swarm handled the long-form editorial prose in heritage-translations-th.ts).
// Long-form content that has no Thai translation falls back to English via
// useLocale()'s t(); this dictionary must do the same for any missing key.

export const DICTIONARY = {
  en: {
    nav_quarters: "Quarters",
    nav_walks: "Walks",
    nav_register: "Register",
    nav_about: "About",
    nav_worlds: "The worlds",
    nav_github: "GitHub",

    hero_eyebrow: "Why this exists",
    front_door_tagline: "The 3D map is the front door. Nine quarters, seven walks, 571 registered monuments — pick a quarter and fly there.",

    section_quarters_title: "The quarters",
    section_walks_title: "The walks",
    section_register_title: "The register, mapped",
    quarters_lede: "From the royal island to the green lung. Click a quarter to fly the map there. Each one is a hand-curated page with its monuments, its walks and its own history.",
    home_quarters_heading: "Nine quarters of the old city",
    home_source_label: "Source",
    home_source_github: "Source on GitHub",
    quarters_index_lede: "Heritage in Bangkok is not scattered evenly — it pools in quarters, each with its own founding story. Nine of them, from the royal island to the green lung, each with its monuments, its walks and its own page.",
    walks_index_lede: "Seven routes, seven different ways of moving through the city's heritage — sacred sites, trading lanes, the royal axis, a market morning, a green loop by bicycle. Every line is a real street-following route; every stop is a documented place.",
    register_mapped_lede: "Every monument with a position precise enough to draw. Filled marks are gazetted; hollow marks await consideration. Pick one for its history, its Royal Gazette entry, and — inside a generated world — the block to stand on.",
    by_bicycle: "by bicycle",

    filter_all: "Every located monument",
    filter_registered: "Gazetted only",
    filter_walkable: "Walkable in Minecraft",
    status_gazetted: "gazetted",
    status_awaiting: "awaiting consideration",

    walk_eyebrow: "Heritage walk",
    walk_stops: "Stops",
    walk_distance: "Distance",
    walk_on_foot: "On foot",
    walk_mode: "Mode",
    walk_mode_walking: "Walking",
    walk_mode_bike: "Bicycle",
    walk_by_the_numbers: "By the numbers",
    walk_on_register: "On the Fine Arts register",
    walk_oldest_gazette: "Oldest gazette entry on this walk",
    walk_walkable_minecraft: "Walkable in Minecraft",
    walk_pace: "Pace",
    walk_longest_shortest: "Longest / shortest leg",
    walk_of: "of",
    walk_stops_lower: "stops",
    walk_years_ago: "years ago",
    walk_newest: "newest",
    walk_gazetted_label: "Gazetted",
    walk_from_stop: "m from stop",
    walk_min_walk: "min walk",

    lang_toggle_label: "Language",
  },
  th: {
    nav_quarters: "ย่านต่างๆ",
    nav_walks: "เส้นทางเดิน",
    nav_register: "ทะเบียนโบราณสถาน",
    nav_about: "เกี่ยวกับ",
    nav_worlds: "โลก Minecraft",
    nav_github: "GitHub",

    hero_eyebrow: "ที่มาของโครงการนี้",
    front_door_tagline: "แผนที่ 3 มิติคือหน้าบ้าน — เก้าย่าน เจ็ดเส้นทางเดิน โบราณสถาน 571 แห่ง เลือกย่านแล้วบินไปดูได้เลย",
    home_quarters_heading: "เก้าย่านของเมืองเก่า",
    home_source_label: "แหล่งข้อมูล",
    home_source_github: "ซอร์สโค้ดบน GitHub",
    quarters_index_lede: "มรดกของกรุงเทพฯ ไม่ได้กระจายเท่ากันทั่วเมือง แต่รวมตัวอยู่เป็นย่านๆ แต่ละย่านมีเรื่องราวการก่อร่างสร้างตัวของตัวเอง เก้าย่านนี้ ตั้งแต่เกาะรัตนโกสินทร์ไปจนถึงปอดสีเขียว แต่ละแห่งมีโบราณสถาน เส้นทางเดิน และหน้าเพจของตัวเอง",
    walks_index_lede: "เจ็ดเส้นทาง เจ็ดวิธีสัมผัสมรดกของเมืองที่ต่างกัน ทั้งสถานที่ศักดิ์สิทธิ์ ตรอกการค้า แกนราชวงศ์ เช้าวันตลาด และวงรอบสีเขียวด้วยจักรยาน ทุกเส้นทางคือเส้นทางเดินจริงตามถนนจริง ทุกจุดแวะคือสถานที่ที่มีการบันทึกไว้",
    register_mapped_lede: "โบราณสถานทุกแห่งที่ระบุตำแหน่งได้แม่นยำพอจะวาดลงแผนที่ จุดทึบคือขึ้นทะเบียนแล้ว จุดกลวงคือรอการพิจารณา เลือกจุดใดก็ได้เพื่อดูประวัติ รายการในราชกิจจานุเบกษา และ — ถ้าอยู่ในโลกที่สร้างแล้ว — พิกัดบล็อกที่จะไปยืนได้",
    by_bicycle: "โดยจักรยาน",

    section_quarters_title: "ย่านต่างๆ",
    section_walks_title: "เส้นทางเดิน",
    section_register_title: "ทะเบียนโบราณสถานบนแผนที่",
    quarters_lede: "จากเกาะรัตนโกสินทร์ไปจนถึงปอดสีเขียวของเมือง คลิกเลือกย่านเพื่อบินแผนที่ไปยังจุดนั้น แต่ละย่านมีหน้าเพจที่เรียบเรียงเอง พร้อมโบราณสถาน เส้นทางเดิน และประวัติของตัวเอง",

    filter_all: "โบราณสถานทั้งหมดที่ระบุตำแหน่งได้",
    filter_registered: "ขึ้นทะเบียนแล้วเท่านั้น",
    filter_walkable: "เดินได้ในโลก Minecraft",
    status_gazetted: "ขึ้นทะเบียนแล้ว",
    status_awaiting: "รอพิจารณาขึ้นทะเบียน",

    walk_eyebrow: "เส้นทางเดินเชิงมรดก",
    walk_stops: "จุดแวะ",
    walk_distance: "ระยะทาง",
    walk_on_foot: "เวลาเดิน",
    walk_mode: "รูปแบบ",
    walk_mode_walking: "เดินเท้า",
    walk_mode_bike: "จักรยาน",
    walk_by_the_numbers: "ตัวเลขที่น่าสนใจ",
    walk_on_register: "อยู่ในทะเบียนกรมศิลปากร",
    walk_oldest_gazette: "รายการขึ้นทะเบียนที่เก่าแก่ที่สุดในเส้นทางนี้",
    walk_walkable_minecraft: "เดินได้ในโลก Minecraft",
    walk_pace: "ความเร็วเฉลี่ย",
    walk_longest_shortest: "ช่วงที่ยาวที่สุด / สั้นที่สุด",
    walk_of: "จาก",
    walk_stops_lower: "จุด",
    walk_years_ago: "ปีที่แล้ว",
    walk_newest: "ล่าสุด",
    walk_gazetted_label: "ขึ้นทะเบียนปี",
    walk_from_stop: "เมตร จากจุดที่",
    walk_min_walk: "นาทีเดิน",

    lang_toggle_label: "ภาษา",
  },
} as const;

export type DictKey = keyof typeof DICTIONARY.en;

// Compile-time guard: adding a key to one language without the other is a
// type error here, not a silent runtime fallback discovered by a user.
type _AssertBothLocalesCoverAllKeys = Record<DictKey, string> & typeof DICTIONARY.th;
const _check: _AssertBothLocalesCoverAllKeys = DICTIONARY.th;
void _check;
