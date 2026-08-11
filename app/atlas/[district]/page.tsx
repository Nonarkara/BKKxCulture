import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AtlasView } from "./AtlasView";
import { worlds, type World } from "../../walkthrough-data";

type Params = { district: string };

type SearchParams = { embed?: string; at?: string };

type Props = {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
};

function parseInitialView(value: string | undefined) {
  if (!value) return undefined;
  const [lng, lat, zoom] = value.split(",").map(Number);
  if (
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(zoom) ||
    lng < -180 ||
    lng > 180 ||
    lat < -90 ||
    lat > 90 ||
    zoom < 0 ||
    zoom > 22
  ) {
    return undefined;
  }
  return { center: [lng, lat] as [number, number], zoom };
}

export function generateStaticParams(): Params[] {
  return worlds.map((world) => ({ district: world.id }));
}

function resolveWorld(district: string): World | undefined {
  return worlds.find((world) => world.id === district);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { district } = await params;
  const world = resolveWorld(district);
  if (!world) {
    return { title: "Atlas not found" };
  }
  return {
    title: `${world.name} — 3D atlas`,
    description: `Walk ${world.name} (${world.thai}) in a 3D browser atlas. ${world.description}`,
    alternates: { canonical: `/atlas/${world.id}` },
    openGraph: {
      title: `${world.name} — 3D atlas · BKKxC(ulture)`,
      description: `Walk ${world.name} in a 3D browser atlas before downloading the Minecraft world.`,
      url: `/atlas/${world.id}`,
    },
  };
}

export default async function AtlasPage({ params, searchParams }: Props) {
  const { district } = await params;
  const query = await searchParams;
  const world = resolveWorld(district);
  if (!world) {
    notFound();
  }
  return (
    <AtlasView
      world={world}
      embedded={query.embed === "1"}
      initialView={parseInitialView(query.at)}
    />
  );
}
