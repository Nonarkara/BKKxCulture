"use client";

import Link from "next/link";
import { PlaceMap } from "../PlaceMap";
import { useLocale } from "../i18n/LocaleContext";
import { WALK_TH } from "../data/heritage-translations-th";
import { MonumentStatus } from "./MonumentStatus";
import {
  walkDistance,
  type Area,
  type Gazette,
  type Walk,
} from "../data/heritage-content";

function gazetteYear(g: Gazette | undefined): number | null {
  const year = Number(g?.date.split("/")[2]);
  return Number.isFinite(year) && year > 1800 ? year : null;
}

function paceLabel(distanceM: number, durationMin: number): string {
  const kmh = distanceM / 1000 / (durationMin / 60);
  return `${kmh.toFixed(1)} km/h`;
}

export function WalkContent({ walk, areas }: { walk: Walk; areas: Area[] }) {
  const { locale, t } = useLocale();
  const th = locale === "th";
  const translation = th ? WALK_TH[walk.slug] : undefined;
  const intro = translation?.intro ?? walk.intro;
  const distance = walkDistance(walk);
  const stats = walk.stats;
  const thisYear = new Date().getFullYear();
  const lang = th ? "th" : undefined;

  return (
    <>
      <article className="register-lede place-page">
        <p className="register-eyebrow">
          {t("walk_eyebrow")} · {walk.pattern}
        </p>
        <h1>
          {walk.name}
          <small lang="th">{walk.thai}</small>
        </h1>

        <dl className="walk-facts">
          <div>
            <dt>{t("walk_stops")}</dt>
            <dd>{walk.stops.length}</dd>
          </div>
          {distance ? (
            <div>
              <dt>{t("walk_distance")}</dt>
              <dd>{distance}</dd>
            </div>
          ) : null}
          {walk.durationMin ? (
            <div>
              <dt>{t("walk_on_foot")}</dt>
              <dd>~{walk.durationMin} min</dd>
            </div>
          ) : null}
          <div>
            <dt>{t("walk_mode")}</dt>
            <dd>{walk.mode === "bike" ? t("walk_mode_bike") : t("walk_mode_walking")}</dd>
          </div>
        </dl>

        <div className="register-intro">
          <p lang={lang}>{intro}</p>
        </div>
      </article>

      <section className="register-explorer place-page">
        <PlaceMap
          center={[walk.stops[0].lon, walk.stops[0].lat]}
          zoom={14}
          fit
          routeSlug={walk.slug}
          markers={walk.stops.map((s, i) => ({
            lat: s.lat,
            lon: s.lon,
            label: s.name,
            n: i + 1,
          }))}
        />
        <p className="register-caption">
          The line is a real street-following walking route (OSRM foot profile, ©
          OpenStreetMap contributors)
          {distance
            ? ` — ${distance}${walk.durationMin ? `, about ${walk.durationMin} minutes at walking pace` : ""}`
            : ""}
          . Follow the numbers.
        </p>

        <div className="walk-stats">
          <h2>{t("walk_by_the_numbers")}</h2>
          <dl>
            {stats.citedInRegister > 0 ? (
              <div>
                <dt>{t("walk_on_register")}</dt>
                <dd>
                  {stats.gazetted} {t("status_gazetted")}
                  {stats.awaitingConsideration
                    ? `, ${stats.awaitingConsideration} ${t("status_awaiting")}`
                    : ""}
                </dd>
              </div>
            ) : null}
            {stats.oldestGazetteYear ? (
              <div>
                <dt>{t("walk_oldest_gazette")}</dt>
                <dd>
                  {stats.oldestGazetteYear}
                  <small>
                    {" "}
                    — {thisYear - stats.oldestGazetteYear} {t("walk_years_ago")}
                    {stats.newestGazetteYear && stats.newestGazetteYear !== stats.oldestGazetteYear
                      ? `, ${t("walk_newest")} ${stats.newestGazetteYear}`
                      : ""}
                  </small>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>{t("walk_walkable_minecraft")}</dt>
              <dd>
                {stats.walkable} {t("walk_of")} {walk.stops.length} {t("walk_stops_lower")}
              </dd>
            </div>
            {walk.distanceM && walk.durationMin ? (
              <div>
                <dt>{t("walk_pace")}</dt>
                <dd>{paceLabel(walk.distanceM, walk.durationMin)}</dd>
              </div>
            ) : null}
            {stats.longestLegM && stats.shortestLegM ? (
              <div>
                <dt>{t("walk_longest_shortest")}</dt>
                <dd>
                  {stats.longestLegM} m / {stats.shortestLegM} m
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        <ol className="walk-stops">
          {walk.stops.map((stop, i) => {
            const note = translation?.stops[stop.name] ?? stop.note;
            return (
              <li key={stop.name} id={`stop-${i + 1}`}>
                <span className="walk-stop-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h2>
                    {stop.name}
                    {stop.thai ? <small lang="th">{stop.thai}</small> : null}
                  </h2>
                  <p lang={lang}>{note}</p>
                  <p className="walk-stop-meta">
                    {stop.fad ? (
                      <>
                        Register {stop.fad.replace("fad-", "no. ")} ·{" "}
                        <MonumentStatus registered={Boolean(stop.registered)} /> ·{" "}
                      </>
                    ) : null}
                    {stop.approx
                      ? "position approximate — " + (stop.approxWhy ?? "hand-placed")
                      : `${stop.lat.toFixed(5)}, ${stop.lon.toFixed(5)}`}
                    {stop.tp ? (
                      <>
                        {" "}· in Minecraft: <code>{stop.tp}</code>
                      </>
                    ) : null}
                  </p>
                  <p className="walk-stop-numbers">
                    {(() => {
                      const year = gazetteYear(stop.gazette);
                      return year ? (
                        <span>
                          {t("walk_gazetted_label")} {year} · {thisYear - year} {t("walk_years_ago")}
                        </span>
                      ) : null;
                    })()}
                    {stop.distanceFromPrevM ? (
                      <span>
                        {stop.distanceFromPrevM} {t("walk_from_stop")} {i}
                        {stop.durationFromPrevMin ? ` · ${stop.durationFromPrevMin} ${t("walk_min_walk")}` : ""}
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {areas.length ? (
          <div className="place-walks">
            <h2>The quarters this walk crosses</h2>
            <ul>
              {areas.map((a) => (
                <li key={a.slug}>
                  <Link href={`/areas/${a.slug}`}>{a.name}</Link>
                  <small>{a.tagline}</small>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}
