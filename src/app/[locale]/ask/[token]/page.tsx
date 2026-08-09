import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDate, isLocale, type Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { threadMessages } from "@/lib/questions";
import { Thread } from "./Thread";

// Ветка меняется в любой момент — кешировать нельзя
export const dynamic = "force-dynamic";

const headings: Record<Locale, { title: string; back: string; saveLink: string }> = {
  uz: {
    title: "Sizning murojaatingiz",
    back: "Yangi savol berish",
    saveLink: "Havolani saqlang: u orqali javobga qaytasiz.",
  },
  ru: {
    title: "Ваше обращение",
    back: "Задать новый вопрос",
    saveLink: "Сохраните ссылку на эту страницу — по ней вы вернётесь к ответу.",
  },
  en: {
    title: "Your request",
    back: "Ask a new question",
    saveLink: "Save this page link — it takes you back to the answer.",
  },
};

export const metadata = { robots: { index: false, follow: false } };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();

  const question = await prisma.question.findUnique({
    where: { token },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!question) notFound();

  const h = headings[locale];
  const messages = threadMessages(question);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-black sm:text-3xl">{h.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {question.topic ? `${question.topic} · ` : ""}
        {formatDate(question.createdAt, locale)}
      </p>

      <div className="mt-6 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.author === "consultant"
                ? "max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-surface p-3"
                : "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent/10 p-3"
            }
          >
            <p className="mb-1 text-xs font-semibold text-muted">
              {m.author === "consultant"
                ? m.authorName || "MYTAX"
                : m.authorName || "—"}
              {" · "}
              {formatDate(m.createdAt, locale)}
            </p>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Thread
          token={token}
          locale={locale}
          answered={question.answered}
          closed={question.closed}
        />
      </div>

      <p className="mt-6 rounded-lg bg-surface px-3 py-2 text-xs text-muted">{h.saveLink}</p>

      <Link
        href={`/${locale}/ask`}
        className="mt-4 inline-block text-sm font-semibold text-accent hover:underline"
      >
        {h.back} →
      </Link>
    </div>
  );
}
