import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SocialLinks } from "@/components/SocialLinks";
import { getDictionary, pickLocalized, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const pages = await prisma.page.findMany({
    where: { published: true },
    orderBy: [{ position: "asc" }, { titleRu: "asc" }],
  });
  return (
    <footer className="mt-16 bg-ink text-white/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <Logo tone="dark" size="sm" />
          <p className="mt-3 text-sm leading-relaxed">{t.footerAbout}</p>
          <SocialLinks className="mt-4" />
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link href={`/${locale}/news`} className="hover:text-white">
            {t.nav.all}
          </Link>
          <Link href={`/${locale}/search`} className="hover:text-white">
            {t.nav.search}
          </Link>
          <Link href={`/${locale}/ask`} className="hover:text-white">
            {locale === "uz"
              ? "Maslahatchidan so‘rang"
              : locale === "en"
                ? "Ask a consultant"
                : "Спроси консультанта"}
          </Link>
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`/${locale}/pages/${p.slug}`}
              className="hover:text-white"
            >
              {pickLocalized(p, "title", locale)}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">
        © {new Date().getFullYear()} MYTAX.uz — {t.footerRights}
      </div>
    </footer>
  );
}
