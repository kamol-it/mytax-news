import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { getDictionary, isLocale, pickLocalized } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const [articles, popular, categories] = await Promise.all([
    prisma.article.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: 13,
      include: { category: true },
    }),
    prisma.article.findMany({
      where: { published: true },
      orderBy: { views: "desc" },
      take: 5,
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
  ]);

  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-10 text-center">
        <p className="text-lg font-semibold">{t.noArticles}</p>
      </div>
    );
  }

  const [hero, ...rest] = articles;

  return (
    <div className="space-y-10">
      <section>
        <h1 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted">
          <span className="h-3 w-1 bg-accent" />
          {t.featured}
        </h1>
        <ArticleCard article={hero} locale={locale} variant="hero" />
      </section>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted">
            <span className="h-3 w-1 bg-accent" />
            {t.latest}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {rest.map((article) => (
              <ArticleCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
          <Link
            href={`/${locale}/news`}
            className="mt-6 inline-block rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
          >
            {t.nav.all} →
          </Link>
        </section>

        <aside className="space-y-8">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted">
              {t.topRead}
            </h2>
            {popular.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                locale={locale}
                variant="compact"
              />
            ))}
          </div>

          {categories.length > 0 ? (
            <div className="rounded-xl border border-line bg-surface p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
                {t.categories}
              </h2>
              <ul className="space-y-2 text-sm">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/${locale}/category/${c.slug}`}
                      className="hover:text-accent"
                    >
                      {pickLocalized(c, "name", locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
