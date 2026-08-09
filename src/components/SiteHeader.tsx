import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary, pickLocalized, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const [categories, pages] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ position: "asc" }, { nameRu: "asc" }] }),
    prisma.page.findMany({
      where: { published: true },
      orderBy: [{ position: "asc" }, { titleRu: "asc" }],
    }),
  ]);

  return (
    <header className="bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
        <Link href={`/${locale}`} aria-label={t.siteName}>
          <Logo />
        </Link>
        <span className="hidden text-xs text-white/45 sm:block">{t.tagline}</span>

        <div className="ml-auto flex items-center gap-3">
          <form action={`/${locale}/search`} className="hidden sm:block">
            <input
              type="search"
              name="q"
              placeholder={t.searchPlaceholder}
              aria-label={t.nav.search}
              className="w-56 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            />
          </form>
          <LocaleSwitcher locale={locale} />
        </div>
      </div>

      <nav className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1 text-sm">
          <Link
            href={`/${locale}/news`}
            className="whitespace-nowrap rounded px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            {t.nav.all}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/${locale}/category/${c.slug}`}
              className="whitespace-nowrap rounded px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {pickLocalized(c, "name", locale)}
            </Link>
          ))}
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/pages/${p.slug}`}
              className="whitespace-nowrap rounded px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {pickLocalized(p, "title", locale)}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
