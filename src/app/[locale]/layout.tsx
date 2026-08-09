import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HtmlLang } from "@/components/HtmlLang";
import { PushPrompt } from "@/components/PushPrompt";
import { AskCtaBand } from "@/components/AskCta";
import { AskWidget } from "@/components/AskWidget";
import { isLocale, locales } from "@/lib/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <HtmlLang locale={locale} />
      <SiteHeader locale={locale} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <AskCtaBand locale={locale} />
      <SiteFooter locale={locale} />
      <AskWidget locale={locale} />
      <PushPrompt locale={locale} />
    </div>
  );
}
