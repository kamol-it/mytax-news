import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { Pagination } from "@/components/Pagination";
import { getDictionary, isLocale, pickLocalized } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;
const PER_PAGE = 12;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return {};
  return { title: pickLocalized(category, "name", locale) };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const where = { published: true, categoryId: category.id };

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-black">{pickLocalized(category, "name", locale)}</h1>
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
        basePath={`/${locale}/category/${category.slug}`}
      />
    </div>
  );
}
