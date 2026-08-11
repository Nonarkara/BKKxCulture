import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceMasthead } from "../../PlaceMasthead";
import { WalkContent } from "../WalkContent";
import { WALKS, areaBySlug, walkBySlug } from "../../data/heritage-content";

type Params = { slug: string };
type Props = { params: Promise<Params> };

export function generateStaticParams(): Params[] {
  return WALKS.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const walk = walkBySlug(slug);
  if (!walk) return { title: "Walk not found" };
  return {
    title: `${walk.name} · heritage walk`,
    description: walk.intro,
    alternates: { canonical: `/walks/${walk.slug}` },
    openGraph: {
      title: `${walk.name} — a Bangkok heritage walk · BKKxC(ulture)`,
      description: walk.intro,
      url: `/walks/${walk.slug}`,
    },
  };
}

export default async function WalkPage({ params }: Props) {
  const { slug } = await params;
  const walk = walkBySlug(slug);
  if (!walk) notFound();

  const areas = walk.areas
    .map((a) => areaBySlug(a))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  return (
    <div className="register">
      <PlaceMasthead />
      <WalkContent walk={walk} areas={areas} />
    </div>
  );
}
