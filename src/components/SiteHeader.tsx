import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SocialLinks } from "@/components/SocialLinks";
import { getDictionary, pickLocalized, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const askLabel: Record<Locale, string> = {
  uz: "Maslahatchidan so‘rang",
  ru: "Спроси консультанта",
  en: "Ask a consultant",
};

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const [categories, pages] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ position: "asc" }, { nameRu: "asc" }] }),
    prisma.page.findMany({
      where: { published: true, inHeader: true },
      orderBy: [{ position: "asc" }, { titleRu: "asc" }],
    }),
  ]);

  const navLink =
    "whitespace-nowrap rounded px-2.5 py-2 text-[13px] font-medium text-foreground/80 transition hover:bg-background hover:text-accent lg:text-sm";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href={`/${locale}`} aria-label={t.siteName}>
          <Logo />
        </Link>
        <span className="hidden text-xs text-muted lg:block">{t.tagline}</span>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <form action={`/${locale}/search`} className="hidden sm:block">
            <input
              type="search"
              name="q"
              placeholder={t.searchPlaceholder}
              aria-label={t.nav.search}
              className="w-44 rounded-full border border-line bg-background px-4 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none lg:w-56"
            />
          </form>

          <Link
            href={`/${locale}/search`}
            aria-label={t.nav.search}
            className="rounded-full border border-line p-2 text-muted transition hover:border-accent hover:text-accent sm:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </Link>

          <SocialLinks className="hidden lg:flex" size="sm" tone="light" />
          <LocaleSwitcher locale={locale} />
        </div>
      </div>

      <nav className="relative border-t border-line">
        {/* На телефоне меню прокручивается, на широких экранах переносится на вторую строку */}
        <div className="mx-auto flex max-w-6xl gap-0.5 overflow-x-auto px-3 py-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-x-visible">
          <Link href={`/${locale}/news`} className={navLink}>
            {t.nav.all}
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={`/${locale}/category/${c.slug}`} className={navLink}>
              {pickLocalized(c, "name", locale)}
            </Link>
          ))}
          <Link href={`/${locale}/ask`} className={`${navLink} font-semibold text-accent`}>
            {askLabel[locale]}
          </Link>
          {pages.map((p) => (
            <Link key={p.id} href={`/${locale}/pages/${p.slug}`} className={navLink}>
              {pickLocalized(p, "title", locale)}
            </Link>
          ))}
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent sm:hidden"
        />
      </nav>
    </header>
  );
}
