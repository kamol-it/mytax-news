import Link from "next/link";
import type { Locale } from "@/lib/i18n";

const texts: Record<Locale, { short: string; title: string; lead: string; button: string }> = {
  uz: {
    short: "Maslahatchidan so‘rang",
    title: "Soliqlar bo‘yicha savolingiz bormi?",
    lead: "Savolingizni yozing — mutaxassis holatingizni ko‘rib chiqadi va javob beradi.",
    button: "Maslahatchidan so‘rang",
  },
  ru: {
    short: "Спроси консультанта",
    title: "Остался вопрос по налогам?",
    lead: "Опишите ситуацию — консультант разберёт её и ответит в вашей ветке на сайте.",
    button: "Спроси консультанта",
  },
  en: {
    short: "Ask a consultant",
    title: "Still have a tax question?",
    lead: "Describe your case — a consultant will review it and reply in your thread.",
    button: "Ask a consultant",
  },
};

const icon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M12 3c-4.97 0-9 3.36-9 7.5 0 2.3 1.24 4.35 3.2 5.73L5.5 20l3.7-1.9c.9.23 1.84.4 2.8.4 4.97 0 9-3.36 9-7.5S16.97 3 12 3Z" />
  </svg>
);

/** Компактная кнопка в шапке — рядом с поиском. */
export function AskCtaButton({ locale }: { locale: Locale }) {
  const t = texts[locale];
  return (
    <Link
      href={`/${locale}/ask`}
      className="hidden items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-hover sm:inline-flex"
    >
      {icon}
      <span className="hidden lg:inline">{t.button}</span>
      <span className="lg:hidden">{t.short}</span>
    </Link>
  );
}

/** Полоса-приглашение над подвалом. */
export function AskCtaBand({ locale }: { locale: Locale }) {
  const t = texts[locale];
  return (
    <section className="mt-16 bg-gradient-to-r from-ink-dark to-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white sm:text-xl">{t.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-white/70">{t.lead}</p>
        </div>
        <Link
          href={`/${locale}/ask`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-white transition hover:bg-accent-hover"
        >
          {icon}
          {t.button}
        </Link>
      </div>
    </section>
  );
}

