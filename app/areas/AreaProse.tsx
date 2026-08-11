"use client";

import { useLocale } from "../i18n/LocaleContext";
import { AREA_TH } from "../data/heritage-translations-th";
import type { Area } from "../data/heritage-content";

// Falls back to the canonical English (area.tagline/area.prose) whenever
// the swarm translation doesn't cover this slug — never a blank prose block.
export function AreaTagline({ area }: { area: Area }) {
  const { locale } = useLocale();
  const th = locale === "th" ? AREA_TH[area.slug] : undefined;
  return <p className="place-tagline">{th?.tagline ?? area.tagline}</p>;
}

export function AreaProse({ area }: { area: Area }) {
  const { locale } = useLocale();
  const th = locale === "th" ? AREA_TH[area.slug] : undefined;
  const prose = th?.prose ?? area.prose;
  return (
    <div className="register-intro">
      {prose.map((p) => (
        <p key={p.slice(0, 24)} lang={th ? "th" : undefined}>
          {p}
        </p>
      ))}
    </div>
  );
}
