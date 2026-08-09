"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n";

const labels: Record<Locale, string> = { uz: "UZ", ru: "RU", en: "EN" };

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const segments = pathname.split("/");
  const rest = isLocale(segments[1]) ? segments.slice(2).join("/") : segments.slice(1).join("/");

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-line p-0.5 text-xs font-semibold">
      {locales.map((l) => {
        const active = l === locale;
        return (
          <Link
            key={l}
            href={`/${l}${rest ? `/${rest}` : ""}`}
            aria-current={active ? "true" : undefined}
            className={
              active
                ? "rounded-full bg-accent px-2.5 py-1 text-white"
                : "rounded-full px-2.5 py-1 text-muted transition hover:text-foreground"
            }
          >
            {labels[l]}
          </Link>
        );
      })}
    </div>
  );
}
