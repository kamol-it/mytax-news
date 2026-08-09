import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, isLocale, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { threadMessages } from "@/lib/questions";

export const revalidate = 300;

const headings: Record<Locale, { title: string; lead: string; empty: string; ask: string }> = {
  uz: {
    title: "Savol-javob",
    lead: "Maslahatchilarimiz javob bergan savollar. Ism va kontaktlar ko‘rsatilmaydi.",
    empty: "Hozircha nashr etilgan javoblar yo‘q.",
    ask: "Savolingizni berish",
  },
  ru: {
    title: "Вопрос-ответ",
    lead: "Вопросы читателей с ответами наших консультантов. Имена и контакты не публикуются.",
    empty: "Опубликованных ответов пока нет.",
    ask: "Задать свой вопрос",
  },
  en: {
    title: "Q&A",
    lead: "Readers' questions answered by our consultants. Names and contacts are not published.",
    empty: "No published answers yet.",
    ask: "Ask your question",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: headings[locale].title, description: headings[locale].lead };
}

export default async function QaListPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const h = headings[locale];

  const questions = await prisma.question.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-black sm:text-3xl">{h.title}</h1>
      <p className="mt-2 text-base text-muted">{h.lead}</p>

      <Link
        href={`/${locale}/ask`}
        className="mt-4 inline-block rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        {h.ask}
      </Link>

      <div className="mt-6 space-y-3">
        {questions.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            {h.empty}
          </p>
        ) : (
          questions.map((q) => {
            const first = threadMessages(q).find((m) => m.author === "visitor");
            return (
              <article key={q.id} className="rounded-xl border border-line bg-surface p-4">
                <h2 className="font-bold">
                  <Link href={`/${locale}/qa/${q.publicSlug}`} className="hover:text-accent">
                    {q.publicTitle || q.topic}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {q.topic ? `${q.topic} · ` : ""}
                  {q.publishedAt ? formatDate(q.publishedAt, locale) : ""}
                </p>
                {first ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{first.body}</p>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
