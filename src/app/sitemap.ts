import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mytax.uz";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, categories, qa] = await Promise.all([
    prisma.article.findMany({
      where: { published: true },
      select: { slug: true, publishedAt: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 5000,
    }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.question.findMany({
      where: { published: true },
      select: { publicSlug: true, publishedAt: true },
      take: 2000,
    }),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    entries.push({ url: `${base}/${locale}`, changeFrequency: "hourly", priority: 1 });
    entries.push({ url: `${base}/${locale}/news`, changeFrequency: "hourly", priority: 0.9 });

    for (const c of categories) {
      entries.push({
        url: `${base}/${locale}/category/${c.slug}`,
        changeFrequency: "daily",
        priority: 0.7,
      });
    }

    entries.push({ url: `${base}/${locale}/qa`, changeFrequency: "daily", priority: 0.7 });
    entries.push({ url: `${base}/${locale}/ask`, changeFrequency: "monthly", priority: 0.6 });

    for (const q of qa) {
      if (!q.publicSlug) continue;
      entries.push({
        url: `${base}/${locale}/qa/${q.publicSlug}`,
        lastModified: q.publishedAt ?? undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    for (const a of articles) {
      entries.push({
        url: `${base}/${locale}/news/${a.slug}`,
        lastModified: a.updatedAt ?? a.publishedAt ?? undefined,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return entries;
}
