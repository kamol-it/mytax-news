import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { AskForm } from "./AskForm";

const headings: Record<Locale, { title: string; lead: string }> = {
  uz: {
    title: "Maslahatchidan so‘rang",
    lead: "Soliqlar, hisobot yoki tekshiruvlar bo‘yicha savolingizni yozing — mutaxassis javob beradi.",
  },
  ru: {
    title: "Спроси консультанта",
    lead: "Задайте вопрос по налогам, отчётности или проверкам — специалист разберёт вашу ситуацию.",
  },
  en: {
    title: "Ask a consultant",
    lead: "Ask about taxes, reporting or audits — a specialist will review your case.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: headings[locale].title };
}

export default async function AskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const h = headings[locale];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black sm:text-3xl">{h.title}</h1>
      <p className="mt-2 text-base text-muted">{h.lead}</p>
      <div className="mt-6 rounded-xl border border-line bg-surface p-4 sm:p-6">
        <AskForm locale={locale} />
      </div>

      <Link
        href={`/${locale}/qa`}
        className="mt-5 inline-block text-sm font-semibold text-accent hover:underline"
      >
        {locale === "uz"
          ? "Nashr etilgan javoblar →"
          : locale === "en"
            ? "Published answers →"
            : "Опубликованные ответы →"}
      </Link>
    </div>
  );
}
