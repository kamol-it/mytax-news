import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/ArticleCard";
import { Pagination } from "@/components/Pagination";
import { getDictionary, isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;
const PER_PAGE = 12;

export default async function NewsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  const [total, articles] = await Promise.all([
    prisma.article.count({ where: { published: true } }),
    prisma.article.findMany({
      where: { published: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black">{t.nav.all}</h1>
      {articles.length === 0 ? (
        <p className="text-muted">{t.noArticles}</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      )}
      <Pagination
        locale={locale}
        page={page}
        totalPages={Math.ceil(total / PER_PAGE)}
        basePath={`/${locale}/news`}
      />
    </div>
  );
}
