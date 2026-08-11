"use client";

import { useLocale } from "../i18n/LocaleContext";
import { ABOUT_TH } from "../data/heritage-translations-th";

const EN = {
  title: "The city that never got the plaque.",
  eyebrow: "Why this exists",
  paragraphs: [
    "I was born in Bangkok. Somewhere there are four small photographs proving it — a baby in a stroller, squinting at whoever is holding the camera, family close by, the old neighbourhood painted flat and pastel behind us the way old photographs always render a place. I grew up in the old town. My parents went to university a short walk from where those photographs were taken, at Thammasat, and years later so did I — first as a student, later as the person standing at the front of the room instead of in it. I have spent more of my life walking these streets than anywhere else on earth, and it still catches me off guard how little that fact seems to count for anything when the subject turns to heritage.",
    "Here is the thing I keep running into. I collect World Heritage cities the way other people collect anything — Penang, Kyoto, Vienna, Graz, Prague, Warsaw, Krakow, and, because my own taste in cities has never been entirely serious, Wigan. Every one of them has a plaque. Every one of them has a boundary somebody drew around the old quarter and a rule somebody wrote about what can and cannot happen inside it. I have stood in a lot of beautiful, correctly maintained places, admired them properly, and then gone back to the hotel feeling like I had visited a diorama rather than a city.",
    "Bangkok has none of that. The old town where I grew up has never been UNESCO-listed, and for a long time I assumed that was an oversight somebody would eventually correct. I do not think that anymore. I think it might be the best thing about it.",
    "A city that gets the plaque gets frozen at whatever moment looked best in the application. A city that does not keeps changing, which is a nuisance for photographers and a mercy for everyone who actually lives there. The temples in my old neighbourhood are not exhibits behind a rope; people still pray in them on an ordinary Tuesday for reasons that have nothing to do with tourism.",
    "The shophouses are not preserved facades with a gift shop behind them. There is a foodstall open under one of them at eleven at night because someone's family has been running it long enough that closing early was never on the table.",
    "People sit out on the street past midnight in a way I have not seen on the rest of my list, because they feel safe enough to, which is its own kind of heritage and nobody puts it on a plaque.",
    "I do not want to overstate this into some kind of victory. The absence of a UNESCO badge is not Bangkok winning a competition it entered on purpose — it is just what happens when nobody applies. And that absence cuts both ways. A living city is also a city nobody is formally obligated to protect, and I have watched buildings in this old town disappear that I would have sworn, walking past them as a kid, would outlast me. Nothing froze them in place. Nothing had to.",
    "That is the actual reason this project exists, underneath the maps and the Minecraft blocks and the walking routes. Thailand's Fine Arts Department does keep a register — 571 monuments in Bangkok alone, each one either formally gazetted or still waiting on a decision nobody has made yet. That register is the closest thing this city has to a plaque, and it is a more honest document than a plaque would be, because it admits, item by item, what is actually protected and what is only hoped for. A UNESCO listing tells you a place has already been decided on. This tells you the decision is still open — which is uncomfortable, and also true, and also exactly the kind of thing I would rather know before the building in question becomes a parking lot.",
    "So this is the whole argument, and I would rather say it plainly than dress it up: the best heritage city I have found, out of every one with a plaque, is the one that never got one — and I think that is worth building something around, rather than something to apologise for.",
  ],
  captions: {
    portrait: "Dr Non, Bangkok, not long after he arrived in it.",
    thammasat:
      "Thammasat University, old town Bangkok — where his parents went to school, where he later taught, where he grew up.",
    watarun1: "Wat Arun — the best World Heritage city he has found is the one that never applied to be one.",
    temples: "Temples everywhere in the old town — still working ones.",
    foodstalls: "Old-neighbourhood foodstalls, still open, at night, under shophouses nobody preserved on purpose.",
    safecity:
      "Bangkok's safe-city charm — people hanging out at night unlike anywhere else on his list, because they feel safe enough to.",
    shophouses: "Old-town shophouses, midnight, still standing because nobody told them to stop being useful.",
    alley: "The alley everyone finds eventually, for the view of Wat Arun at the end of it.",
    waterfront: "The river the old town was built around, still doing what it has always done at the end of the day.",
    openspace: "Open space in the heart of the old town — still just a park, not an exhibit about one.",
  },
};

function Figure({
  src,
  alt,
  caption,
  eager,
}: {
  src: string;
  alt: string;
  caption: string;
  eager?: boolean;
}) {
  return (
    <figure className="register-figure">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function Para({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="register-intro">
      <p lang={lang}>{children}</p>
    </div>
  );
}

// Structure matches the original hand-laid-out English page exactly: a
// two-paragraph block between the Thammasat and Wat Arun figures, and two
// consecutive figures (safe-city, shophouses) with no paragraph between
// them. Only the words swap by locale — the layout is fixed.
export function AboutEssay() {
  const { locale } = useLocale();
  const th = locale === "th";
  const p = th ? ABOUT_TH.paragraphs : EN.paragraphs;
  const c = th ? ABOUT_TH.captions : EN.captions;
  const lang = th ? "th" : undefined;

  return (
    <>
      <p className="register-eyebrow">{th ? ABOUT_TH.eyebrow : EN.eyebrow}</p>
      <h1>{th ? ABOUT_TH.title : EN.title}</h1>

      <Figure
        src="/about/dr-non-siam-square.jpg"
        alt="Four photographs of Dr Non as a baby in Bangkok, in a stroller with family nearby"
        caption={c.portrait}
        eager
      />
      <Para lang={lang}>{p[0]}</Para>

      <Figure
        src="/about/dr-non-thammasat.jpg"
        alt="Dr Non standing outside a clock tower building at Thammasat University in Bangkok's old town"
        caption={c.thammasat}
        eager
      />
      <div className="register-intro">
        <p lang={lang}>{p[1]}</p>
        <p lang={lang}>{p[2]}</p>
      </div>

      <Figure
        src="/about/wat-arun-lasers.jpg"
        alt="Wat Arun lit up at night across the Chao Phraya river"
        caption={c.watarun1}
      />
      <Para lang={lang}>{p[3]}</Para>

      <Figure
        src="/about/temples-everywhere.jpg"
        alt="A gilded temple roof at night with motorbikes parked in front and someone walking past"
        caption={c.temples}
      />
      <Para lang={lang}>{p[4]}</Para>

      <Figure
        src="/about/foodstalls-at-night.jpg"
        alt="Foodstalls lit up at night in front of old shophouses in Bangkok's old town"
        caption={c.foodstalls}
      />
      <Para lang={lang}>{p[5]}</Para>

      <Figure
        src="/about/safe-city-night.jpg"
        alt="People hanging out on a Bangkok street corner at night, old shophouses lit under traffic signals"
        caption={c.safecity}
      />
      <Figure
        src="/about/shophouses-midnight.jpg"
        alt="Old town shophouses lit at midnight on an empty Bangkok street corner"
        caption={c.shophouses}
      />
      <Para lang={lang}>{p[6]}</Para>

      <Figure
        src="/about/alley-wat-arun-view.jpg"
        alt="A narrow alley in Bangkok's old town opening onto a view of Wat Arun across the river"
        caption={c.alley}
      />
      <Para lang={lang}>{p[7]}</Para>

      <Figure
        src="/about/bangkok-waterfront.jpg"
        alt="Families relaxing on the Chao Phraya riverfront promenade at golden hour in Bangkok"
        caption={c.waterfront}
      />
      <Para lang={lang}>{p[8]}</Para>

      <Figure
        src="/about/open-space-oldtown.jpg"
        alt="Families and children on a lawn in an open public space in Bangkok's old town, a heritage building behind them"
        caption={c.openspace}
      />
    </>
  );
}
