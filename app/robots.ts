import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://bkk.nonarkara.org/sitemap.xml",
    host: "https://bkk.nonarkara.org",
  };
}
