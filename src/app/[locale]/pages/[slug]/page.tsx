import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDate, isLocale, pickLocalized } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

async function loadPage(slug: string) {
  return prisma.page.findFirst({ where: { slug, published: true } });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const page = await loadPage(slug);
  if (!page) return {};

  return {
    title: pickLocalized(page, "title", locale),
    alternates: { canonical: `/${locale}/pages/${page.slug}` },
  };
}

export default async function StaticPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const page = await loadPage(slug);
  if (!page) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-black leading-tight sm:text-4xl">
        {pickLocalized(page, "title", locale)}
      </h1>
      <div
        className="prose-news mt-6"
        // HTML приходит из админки и очищен sanitizeHtml при сохранении
        dangerouslySetInnerHTML={{ __html: pickLocalized(page, "body", locale) }}
      />
      <p className="mt-10 text-xs text-muted">
        {formatDate(page.updatedAt, locale)}
      </p>
    </article>
  );
}
