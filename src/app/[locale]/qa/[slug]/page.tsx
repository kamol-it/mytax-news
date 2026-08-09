import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { formatDate, isLocale, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { threadMessages } from "@/lib/questions";

export const revalidate = 300;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

const labels: Record<Locale, { question: string; answer: string; back: string; ask: string }> = {
  uz: { question: "Savol", answer: "Javob", back: "Barcha savollar", ask: "Maslahatchidan so‘rang" },
  ru: { question: "Вопрос", answer: "Ответ", back: "Все вопросы", ask: "Спроси консультанта" },
  en: { question: "Question", answer: "Answer", back: "All questions", ask: "Ask a consultant" },
};

async function load(slug: string) {
  return prisma.question.findFirst({
    where: { publicSlug: slug, published: true },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const question = await load(slug);
  if (!question) return {};

  const first = threadMessages(question).find((m) => m.author === "visitor");
  return {
    title: question.publicTitle || question.topic,
    description: first?.body.slice(0, 200),
    alternates: { canonical: `/${locale}/qa/${slug}` },
  };
}

export default async function QaPage({ params }: PageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const question = await load(slug);
  if (!question) notFound();

  const l = labels[locale];
  const messages = threadMessages(question);

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">
        {question.topic || l.question}
      </p>
      <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
        {question.publicTitle || question.topic}
      </h1>
      <p className="mt-2 text-xs text-muted">
        {question.publishedAt ? formatDate(question.publishedAt, locale) : ""}
      </p>

      <div className="mt-6 space-y-4">
        {messages.map((m) => (
          <section
            key={m.id}
            className={
              m.author === "consultant"
                ? "rounded-xl border border-accent/30 bg-surface p-4"
                : "rounded-xl bg-background p-4"
            }
          >
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted">
              {m.author === "consultant" ? l.answer : l.question}
            </p>
            <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{m.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/${locale}/ask`}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {l.ask}
        </Link>
        <Link
          href={`/${locale}/qa`}
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:border-accent hover:text-accent"
        >
          {l.back}
        </Link>
      </div>
    </article>
  );
}
