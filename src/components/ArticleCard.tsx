import Image from "next/image";
import Link from "next/link";
import {
  formatDate,
  getDictionary,
  pickLocalized,
  type Locale,
} from "@/lib/i18n";

export type ArticleCardData = {
  slug: string;
  coverImage: string | null;
  coverWidth?: number | null;
  coverHeight?: number | null;
  videoUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  views: number;
  category: { slug: string; nameUz: string; nameRu: string; nameEn: string } | null;
} & Record<string, unknown>;

export function ArticleCard({
  article,
  locale,
  variant = "default",
}: {
  article: ArticleCardData;
  locale: Locale;
  variant?: "default" | "hero" | "compact";
}) {
  const t = getDictionary(locale);
  // Вертикальные картинки (инфографика) кадрируем сверху: там заголовок
  const portrait =
    Boolean(article.coverWidth && article.coverHeight) &&
    article.coverHeight! > article.coverWidth!;
  const fit = portrait ? "object-cover object-top" : "object-cover object-center";
  const title = pickLocalized(article, "title", locale);
  const excerpt = pickLocalized(article, "excerpt", locale);
  const date = formatDate(article.publishedAt ?? article.createdAt, locale);
  const href = `/${locale}/news/${article.slug}`;

  if (variant === "compact") {
    return (
      <article className="flex gap-3 border-b border-line py-3 last:border-0">
        {article.coverImage ? (
          <Link href={href} className="relative h-16 w-24 shrink-0 overflow-hidden rounded">
            <Image src={article.coverImage} alt="" fill sizes="96px" className={fit} />
          </Link>
        ) : null}
        <div className="min-w-0">
          <Link href={href} className="text-sm font-semibold leading-snug hover:text-accent">
            {title}
          </Link>
          <p className="mt-1 text-xs text-muted">{date}</p>
        </div>
      </article>
    );
  }

  const hero = variant === "hero";

  return (
    <article
      className={`group overflow-hidden rounded-xl border border-line bg-surface transition hover:shadow-md ${
        hero ? "sm:flex" : ""
      }`}
    >
      <Link
        href={href}
        className={`relative block bg-background ${hero ? "aspect-[16/9] sm:aspect-auto sm:w-1/2" : "aspect-[16/9]"}`}
      >
        {article.coverImage ? (
          <Image
            src={article.coverImage}
            alt={title}
            fill
            sizes={hero ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 768px) 100vw, 33vw"}
            className={`${fit} transition group-hover:scale-[1.02]`}
            priority={hero}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-black text-line">
            <span className="text-accent/25">MY</span>TAX
          </div>
        )}
        {article.videoUrl ? (
          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
            ▶ video
          </span>
        ) : null}
      </Link>

      <div className={`p-4 ${hero ? "sm:w-1/2 sm:p-6" : ""}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {article.category ? (
            <Link
              href={`/${locale}/category/${article.category.slug}`}
              className="font-semibold uppercase tracking-wide text-accent hover:underline"
            >
              {pickLocalized(article.category, "name", locale)}
            </Link>
          ) : null}
          <span className="whitespace-nowrap">{date}</span>
        </div>

        <h2 className={`mt-2 font-bold leading-snug ${hero ? "text-2xl" : "text-lg"}`}>
          <Link href={href} className="hover:text-accent">
            {title}
          </Link>
        </h2>

        {excerpt ? (
          <p className={`mt-2 text-sm text-muted ${hero ? "" : "line-clamp-3"}`}>{excerpt}</p>
        ) : null}

        <Link
          href={href}
          className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
        >
          {t.readMore} →
        </Link>
      </div>
    </article>
  );
}
