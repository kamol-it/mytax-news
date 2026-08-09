import Link from "next/link";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatDate } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { threadMessages } from "@/lib/questions";
import {
  deleteQuestion,
  togglePublished,
  toggleQuestionAnswered,
  toggleQuestionClosed,
} from "../../actions";
import { AnswerForm } from "./AnswerForm";
import { AdminPushButton } from "./AdminPushButton";

export const metadata = { title: "Вопросы консультанту" };
export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const questions = await prisma.question.findMany({
    orderBy: [{ answered: "asc" }, { lastMessageAt: "desc" }],
    take: 100,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const open = questions.filter((q) => !q.answered && !q.closed).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-black sm:text-2xl">Вопросы консультанту</h1>
        <span className="text-sm text-muted">без ответа: {open}</span>
        <div className="w-full sm:ml-auto sm:w-auto">
          <AdminPushButton />
        </div>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            Вопросов пока нет. Они приходят со страницы «Спроси консультанта».
          </p>
        ) : (
          questions.map((q) => {
            const messages = threadMessages(q);

            return (
              <div
                key={q.id}
                className={`rounded-xl border bg-surface p-4 ${
                  q.answered || q.closed ? "border-line" : "border-accent/40"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold">{q.name}</span>
                  <a
                    href={q.contact.includes("@") ? `mailto:${q.contact}` : `tel:${q.contact}`}
                    className="text-accent hover:underline"
                  >
                    {q.contact}
                  </a>
                  {q.topic ? <span className="text-muted">· {q.topic}</span> : null}
                  <span className="text-xs text-muted sm:ml-auto">
                    {q.locale.toUpperCase()} · {formatDate(q.lastMessageAt, "ru")}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.author === "consultant"
                          ? "rounded-lg bg-emerald-50 p-2.5 text-sm"
                          : "rounded-lg bg-background p-2.5 text-sm"
                      }
                    >
                      <p className="mb-0.5 text-xs font-semibold text-muted">
                        {m.author === "consultant" ? m.authorName || "Консультант" : m.authorName || q.name}
                        {" · "}
                        {formatDate(m.createdAt, "ru")}
                      </p>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  ))}
                </div>

                {q.closed ? (
                  <p className="mt-3 text-sm text-muted">Обращение закрыто.</p>
                ) : (
                  <AnswerForm questionId={q.id} />
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <form action={toggleQuestionAnswered}>
                    <input type="hidden" name="id" value={q.id} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        q.answered
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {q.answered ? "отвечено" : "ждёт ответа"}
                    </button>
                  </form>

                  <form action={togglePublished} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={q.id} />
                    {!q.published ? (
                      <input
                        name="publicTitle"
                        defaultValue={q.publicTitle || q.topic}
                        placeholder="заголовок для «Вопрос-ответ»"
                        className="w-56 rounded-lg border border-line px-2 py-1 text-xs"
                      />
                    ) : null}
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        q.published ? "bg-accent/10 text-accent" : "bg-background text-muted"
                      }`}
                      title="Публикация без имени и контакта посетителя"
                    >
                      {q.published ? "опубликовано в «Вопрос-ответ»" : "опубликовать ответ"}
                    </button>
                  </form>

                  {q.published && q.publicSlug ? (
                    <Link
                      href={`/ru/qa/${q.publicSlug}`}
                      target="_blank"
                      className="text-xs text-muted hover:text-accent"
                    >
                      ↗ на сайте
                    </Link>
                  ) : null}

                  <form action={toggleQuestionClosed}>
                    <input type="hidden" name="id" value={q.id} />
                    <button type="submit" className="text-xs text-muted hover:text-accent">
                      {q.closed ? "открыть заново" : "закрыть"}
                    </button>
                  </form>

                  <form action={deleteQuestion} className="ml-auto">
                    <input type="hidden" name="id" value={q.id} />
                    <ConfirmSubmit
                      message="Удалить обращение вместе с перепиской?"
                      className="text-xs text-muted hover:text-accent"
                    >
                      Удалить
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
