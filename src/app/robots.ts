import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mytax.uz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/uz/ask/", "/ru/ask/", "/en/ask/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
