import type { MetadataRoute } from "next";
import { worlds } from "./walkthrough-data";
import { AREAS, WALKS } from "./data/heritage-content";

const siteUrl = "https://bkk.nonarkara.org";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-09T00:00:00+07:00");

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/worlds`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    ...AREAS.map((area) => ({
      url: `${siteUrl}/areas/${area.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...WALKS.map((walk) => ({
      url: `${siteUrl}/walks/${walk.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...worlds.map((world) => ({
      url: `${siteUrl}/atlas/${world.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
