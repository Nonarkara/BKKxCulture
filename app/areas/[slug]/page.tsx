import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceMasthead } from "../../PlaceMasthead";
import { PlaceMap } from "../../PlaceMap";
import { AreaProse, AreaTagline } from "../AreaProse";
import { MonumentStatus } from "../../walks/MonumentStatus";
import {
  AREAS,
  areaBySlug,
  photoFor,
  walkBySlug,
  walkDistance,
} from "../../data/heritage-content";

type Params = { slug: string };
type Props = { params: Promise<Params> };

export function generateStaticParams(): Params[] {
  return AREAS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const area = areaBySlug(slug);
  if (!area) return { title: "Quarter not found" };
  return {
    title: `${area.name} · heritage quarter`,
    description: area.tagline,
    alternates: { canonical: `/areas/${area.slug}` },
    openGraph: {
      title: `${area.name} — Bangkok heritage · BKKxC(ulture)`,
      description: area.tagline,
      url: `/areas/${area.slug}`,
      images: photoFor(area.photo) ? [{ url: photoFor(area.photo)!.file }] : undefined,
    },
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const area = areaBySlug(slug);
  if (!area) notFound();

  const photo = photoFor(area.photo);
  const walks = area.walks
    .map((w) => walkBySlug(w))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));
  const pinned = area.monuments.filter((m) => m.lat && m.lon);

  return (
    <div className="register">
      <PlaceMasthead />

      <article className="register-lede place-page">
        <p className="register-eyebrow">
          Heritage quarter · <span lang="th">{area.district}</span>
        </p>
        <h1>
          {area.name}
          <small lang="th">{area.thai}</small>
        </h1>
        <AreaTagline area={area} />

        {photo ? (
          <figure className="register-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.file} alt={`${area.name} — ${area.tagline}`} loading="eager" />
            <figcaption>
              {area.name}. Photo: {photo.artist} ·{" "}
              <a href={photo.descriptionUrl} target="_blank" rel="noreferrer">
                Wikimedia Commons
              </a>{" "}
              · {photo.licence}.
            </figcaption>
          </figure>
        ) : null}

        <AreaProse area={area} />
      </article>

      <section className="register-explorer place-page">
        <PlaceMap
          center={area.center}
          zoom={area.zoom}
          markers={pinned.map((m) => ({
            lat: m.lat as number,
            lon: m.lon as number,
            label: m.name,
            muted: !m.registered,
          }))}
        />
        <p className="register-caption">
          Register monuments of the quarter — filled marks are gazetted, hollow marks
          await consideration. Positions from the Fine Arts Department register,
          relocated where needed as documented on the{" "}
          <Link href="/heritage#register">register page</Link>.
        </p>

        {area.monuments.length ? (
          <div className="place-monuments">
            <h2>In the Fine Arts register</h2>
            <ul>
              {area.monuments.map((m) => (
                <li key={m.fad}>
                  <span
                    className={m.registered ? "seal is-gazetted" : "seal is-awaiting"}
                    aria-hidden="true"
                  />
                  <span lang="th">{m.name}</span>
                  <small>
                    <MonumentStatus registered={m.registered} />
                  </small>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="place-monuments">
            <h2>In the Fine Arts register</h2>
            <p className="place-none">
              Nothing here is on the register — this quarter&apos;s heritage is the
              landscape itself, which no gazette volume knows how to hold.
            </p>
          </div>
        )}

        {walks.length ? (
          <div className="place-walks">
            <h2>Walks through this quarter</h2>
            <ul>
              {walks.map((w) => (
                <li key={w.slug}>
                  <Link href={`/walks/${w.slug}`}>{w.name}</Link>
                  <small>
                    {w.pattern} · {w.stops.length} stops
                    {walkDistance(w) ? ` · ${walkDistance(w)}` : ""}
                    {w.mode === "bike" ? " · by bicycle" : ""}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
