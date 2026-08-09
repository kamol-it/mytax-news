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
import { ChatAutoRefresh } from "./ChatAutoRefresh";
import { ScrollToBottom } from "./ScrollToBottom";

export const metadata = { title: "Вопросы консультанту" };
export const dynamic = "force-dynamic";

const LIST_LIMIT = 100;

function shortTime(date: Date): string {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const onlyOpen = params.filter === "open";
  const where = onlyOpen ? { answered: false, closed: false } : {};

  const [threads, openCount] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: [{ lastMessageAt: "desc" }],
      take: LIST_LIMIT,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.question.count({ where: { answered: false, closed: false } }),
  ]);

  const selectedId = params.id ?? threads[0]?.id;
  const selected = selectedId
    ? await prisma.question.findUnique({
        where: { id: selectedId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  const messages = selected ? threadMessages(selected) : [];
  const query = onlyOpen ? "&filter=open" : "";

  return (
    <div className="-mx-4 -my-5 sm:-my-6">
      <ChatAutoRefresh />

      <div className="flex h-[calc(100vh-8.5rem)] flex-col sm:h-[calc(100vh-3.25rem)] lg:grid lg:grid-cols-[300px_1fr]">
        {/* Список обращений */}
        <aside
          className={`flex min-h-0 flex-col border-line bg-surface lg:border-r ${
            params.id ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
            <h1 className="text-sm font-black">Обращения</h1>
            <Link
              href={onlyOpen ? "/admin/questions" : "/admin/questions?filter=open"}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                onlyOpen ? "bg-accent text-white" : "bg-background text-muted hover:text-accent"
              }`}
            >
              без ответа: {openCount}
            </Link>
            <div className="w-full">
              <AdminPushButton />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.length === 0 ? (
              <p className="p-4 text-sm text-muted">
                Обращений нет. Они появляются после вопроса из чата на сайте.
              </p>
            ) : (
              threads.map((thread) => {
                const last = thread.messages[0];
                const preview = last?.body ?? thread.body;
                const waiting = !thread.answered && !thread.closed;
                const active = thread.id === selectedId;

                return (
                  <Link
                    key={thread.id}
                    href={`/admin/questions?id=${thread.id}${query}`}
                    className={`flex gap-2 border-b border-line px-3 py-2.5 transition ${
                      active ? "bg-accent/10" : "hover:bg-background"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        waiting ? "bg-accent" : "bg-transparent"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {thread.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">
                          {shortTime(thread.lastMessageAt)}
                        </span>
                      </span>
                      {thread.topic ? (
                        <span className="block truncate text-[11px] text-accent">
                          {thread.topic}
                        </span>
                      ) : null}
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {last?.author === "consultant" ? "Вы: " : ""}
                        {preview}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        {/* Переписка */}
        <section className={`flex min-h-0 flex-col ${params.id ? "flex" : "hidden lg:flex"}`}>
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
              Выберите обращение слева.
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
                <Link
                  href={`/admin/questions${onlyOpen ? "?filter=open" : ""}`}
                  className="text-sm text-muted hover:text-accent lg:hidden"
                >
                  ← список
                </Link>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{selected.name}</p>
                  <p className="truncate text-xs text-muted">
                    <a
                      href={
                        selected.contact.includes("@")
                          ? `mailto:${selected.contact}`
                          : `tel:${selected.contact}`
                      }
                      className="text-accent hover:underline"
                    >
                      {selected.contact}
                    </a>
                    {selected.topic ? ` · ${selected.topic}` : ""} ·{" "}
                    {selected.locale.toUpperCase()}
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <form action={toggleQuestionAnswered}>
                    <input type="hidden" name="id" value={selected.id} />
                    <button
                      type="submit"
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        selected.answered
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {selected.answered ? "отвечено" : "ждёт ответа"}
                    </button>
                  </form>

                  <form action={togglePublished} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={selected.id} />
                    {!selected.published ? (
                      <input
                        name="publicTitle"
                        defaultValue={selected.publicTitle || selected.topic}
                        placeholder="заголовок для «Вопрос-ответ»"
                        className="w-40 rounded-lg border border-line px-2 py-1 text-[11px]"
                      />
                    ) : null}
                    <button
                      type="submit"
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        selected.published
                          ? "bg-accent/10 text-accent"
                          : "bg-background text-muted hover:text-accent"
                      }`}
                      title="Публикуется без имени и контакта посетителя"
                    >
                      {selected.published ? "опубликовано" : "опубликовать"}
                    </button>
                  </form>

                  {selected.published && selected.publicSlug ? (
                    <Link
                      href={`/ru/qa/${selected.publicSlug}`}
                      target="_blank"
                      className="text-[11px] text-muted hover:text-accent"
                    >
                      ↗
                    </Link>
                  ) : null}

                  <form action={toggleQuestionClosed}>
                    <input type="hidden" name="id" value={selected.id} />
                    <button type="submit" className="text-[11px] text-muted hover:text-accent">
                      {selected.closed ? "открыть" : "закрыть"}
                    </button>
                  </form>

                  <form action={deleteQuestion}>
                    <input type="hidden" name="id" value={selected.id} />
                    <ConfirmSubmit
                      message="Удалить обращение вместе с перепиской?"
                      className="text-[11px] text-muted hover:text-accent"
                    >
                      удалить
                    </ConfirmSubmit>
                  </form>
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background px-3 py-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.author === "consultant"
                        ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-emerald-50 px-3 py-2"
                        : "max-w-[80%] rounded-2xl rounded-bl-sm bg-surface px-3 py-2"
                    }
                  >
                    <p className="mb-0.5 text-[11px] font-semibold text-muted">
                      {m.author === "consultant" ? m.authorName || "Вы" : m.authorName}
                      {" · "}
                      {formatDate(m.createdAt, "ru")}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  </div>
                ))}
                <ScrollToBottom trigger={`${selected.id}-${messages.length}`} />
              </div>

              <footer className="border-t border-line bg-surface px-3 py-2.5">
                {selected.closed ? (
                  <p className="text-sm text-muted">Обращение закрыто.</p>
                ) : (
                  <AnswerForm questionId={selected.id} />
                )}
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
