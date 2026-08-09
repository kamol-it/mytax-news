import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleCard";
import { VideoEmbed } from "@/components/VideoEmbed";
import { ShareButtons } from "@/components/ShareButtons";
import {
  formatDate,
  getDictionary,
  isLocale,
  pickLocalized,
  type Locale,
} from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ locale: string; slug: string }> };

async function loadArticle(slug: string) {
  return prisma.article.findFirst({
    where: { slug, published: true },
    include: { category: true, author: true, media: true },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = await loadArticle(slug);
  if (!article) return {};

  const title = pickLocalized(article, "title", locale);
  const description = pickLocalized(article, "excerpt", locale);

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/news/${article.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: (article.publishedAt ?? article.createdAt).toISOString(),
      images: article.coverImage ? [article.coverImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const article = await loadArticle(slug);
  if (!article) notFound();

  const t = getDictionary(locale as Locale);
  const title = pickLocalized(article, "title", locale);
  const excerpt = pickLocalized(article, "excerpt", locale);
  const body = pickLocalized(article, "body", locale);

  // Счётчик просмотров: не блокируем рендер, ошибки игнорируем.
  void prisma.article
    .update({ where: { id: article.id }, data: { views: { increment: 1 } } })
    .catch(() => undefined);

  const related = article.categoryId
    ? await prisma.article.findMany({
        where: {
          published: true,
          categoryId: article.categoryId,
          id: { not: article.id },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
        include: { category: true },
      })
    : [];

  const galleryImages = article.media.filter(
    (m) => m.kind === "image" && m.url !== article.coverImage,
  );

  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {article.category ? (
          <Link
            href={`/${locale}/category/${article.category.slug}`}
            className="font-semibold uppercase tracking-wide text-accent hover:underline"
          >
            {pickLocalized(article.category, "name", locale)}
          </Link>
        ) : null}
        <span className="whitespace-nowrap">
          {t.publishedOn}: {formatDate(article.publishedAt ?? article.createdAt, locale)}
        </span>
        <span>
          {article.views} {t.views}
        </span>
      </div>

      <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">{title}</h1>
      {excerpt ? <p className="mt-3 text-base text-muted sm:text-lg">{excerpt}</p> : null}
      {article.author ? (
        <p className="mt-3 text-sm text-muted">✎ {article.author.name}</p>
      ) : null}

      {article.coverImage ? (
        // Показываем обложку целиком: вертикальные инфографики нельзя обрезать
        <div className="mt-6 overflow-hidden rounded-xl bg-background">
          <Image
            src={article.coverImage}
            alt={title}
            width={article.coverWidth ?? 1200}
            height={article.coverHeight ?? 675}
            sizes="(max-width: 768px) 100vw, 768px"
            className="mx-auto h-auto w-full max-w-full"
            priority
          />
        </div>
      ) : null}

      {article.videoUrl ? (
        <div className="mt-6">
          <VideoEmbed url={article.videoUrl} title={title} />
        </div>
      ) : null}

      <div
        className="prose-news mt-8"
        // HTML приходит из админки и очищен sanitizeHtml при сохранении
        dangerouslySetInnerHTML={{ __html: body }}
      />

      {galleryImages.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {galleryImages.map((m) => (
            <div key={m.id} className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image src={m.url} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
            </div>
          ))}
        </div>
      ) : null}

      <ShareButtons title={title} />

      <Link
        href={`/${locale}/news`}
        className="mt-8 inline-block text-sm font-semibold text-accent hover:underline"
      >
        ← {t.backToNews}
      </Link>

      {related.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted">
            {t.relatedNews}
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <ArticleCard key={r.id} article={r} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
