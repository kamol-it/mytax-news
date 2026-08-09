import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { getDictionary, isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const articles = query
    ? await prisma.article.findMany({
        where: {
          published: true,
          OR: [
            { titleUz: { contains: query } },
            { titleRu: { contains: query } },
            { titleEn: { contains: query } },
            { excerptUz: { contains: query } },
            { excerptRu: { contains: query } },
            { excerptEn: { contains: query } },
            { bodyUz: { contains: query } },
            { bodyRu: { contains: query } },
            { bodyEn: { contains: query } },
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 30,
        include: { category: true },
      })
    : [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-black">{t.searchTitle}</h1>

      <form action={`/${locale}/search`} className="mb-8 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t.searchPlaceholder}
          className="w-full max-w-md rounded-lg border border-line bg-surface px-4 py-2 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-5 py-2 font-semibold text-white hover:bg-accent-hover"
        >
          {t.nav.search}
        </button>
      </form>

      {query && articles.length === 0 ? <p className="text-muted">{t.nothingFound}</p> : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} locale={locale} />
        ))}
      </div>
    </div>
  );
}
