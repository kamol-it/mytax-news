import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatDate } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { deleteQuestion, toggleQuestionAnswered } from "../../actions";

export const metadata = { title: "Вопросы консультанту" };

export default async function QuestionsPage() {
  const questions = await prisma.question.findMany({
    orderBy: [{ answered: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const open = questions.filter((q) => !q.answered).length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-black">Вопросы консультанту</h1>
        <span className="text-sm text-muted">без ответа: {open}</span>
      </div>

      <div className="space-y-3">
        {questions.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
            Вопросов пока нет. Они приходят со страницы «Спроси консультанта».
          </p>
        ) : (
          questions.map((q) => (
            <div
              key={q.id}
              className={`rounded-xl border bg-surface p-4 ${
                q.answered ? "border-line" : "border-accent/40"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{q.name}</span>
                <a
                  href={q.contact.includes("@") ? `mailto:${q.contact}` : `tel:${q.contact}`}
                  className="text-accent hover:underline"
                >
                  {q.contact}
                </a>
                {q.topic ? <span className="text-muted">· {q.topic}</span> : null}
                <span className="ml-auto text-xs text-muted">
                  {q.locale.toUpperCase()} · {formatDate(q.createdAt, "ru")}
                </span>
              </div>

              <p className="mt-2 whitespace-pre-wrap text-sm">{q.body}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
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

                <form action={deleteQuestion} className="ml-auto">
                  <input type="hidden" name="id" value={q.id} />
                  <ConfirmSubmit
                    message="Удалить вопрос?"
                    className="text-xs text-muted hover:text-accent"
                  >
                    Удалить
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
