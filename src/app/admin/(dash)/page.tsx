import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/i18n";

/** Границу «за 7 дней» считаем вне рендера: правило чистоты компонентов. */
function weekAgoDate(): Date {
  return new Date(Date.now() - 7 * 86_400_000);
}

export default async function AdminDashboard() {
  const weekAgo = weekAgoDate();

  const [
    total,
    published,
    drafts,
    categories,
    mediaCount,
    subscribers,
    questionsTotal,
    questionsOpen,
    questionsWeek,
    recent,
    recentQuestions,
  ] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { published: true } }),
    prisma.article.count({ where: { published: false } }),
    prisma.category.count(),
    prisma.media.count(),
    prisma.pushSubscription.count(),
    prisma.question.count(),
    prisma.question.count({ where: { answered: false } }),
    prisma.question.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { category: true },
    }),
    prisma.question.findMany({
      where: { answered: false },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const stats = [
    { label: "Всего новостей", value: total },
    { label: "Опубликовано", value: published },
    { label: "Черновики", value: drafts },
    { label: "Рубрик", value: categories },
    { label: "Медиафайлов", value: mediaCount },
    { label: "Подписчиков push", value: subscribers },
  ];

  const questionStats = [
    { label: "Вопросов всего", value: questionsTotal },
    { label: "Ждут ответа", value: questionsOpen, alert: questionsOpen > 0 },
    { label: "За последние 7 дней", value: questionsWeek },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black sm:text-2xl">Обзор</h1>
        <Link
          href="/admin/articles/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          + Новая новость
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-2xl font-black">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted">
            Вопросы консультанту
          </h2>
          <Link href="/admin/questions" className="text-sm text-accent hover:underline">
            все вопросы →
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {questionStats.map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border bg-surface p-4 ${
                s.alert ? "border-accent/50" : "border-line"
              }`}
            >
              <p className={`text-2xl font-black ${s.alert ? "text-accent" : ""}`}>{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {recentQuestions.length > 0 ? (
          <div className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {recentQuestions.map((q) => (
              <Link
                key={q.id}
                href="/admin/questions"
                className="block p-3 text-sm hover:bg-background"
              >
                <span className="font-medium">{q.name}</span>
                <span className="ml-2 text-xs text-muted">
                  {q.topic || "без темы"} · {formatDate(q.createdAt, "ru")}
                </span>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{q.body}</p>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
          Последние изменения
        </h2>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-muted">Пока ничего нет.</p>
          ) : (
            recent.map((a) => (
              <Link
                key={a.id}
                href={`/admin/articles/${a.id}`}
                className="flex items-center gap-3 p-3 text-sm hover:bg-background"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    a.published ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{a.titleRu}</span>
                <span className="hidden shrink-0 text-xs text-muted sm:block">
                  {a.category?.nameRu ?? "—"}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {formatDate(a.updatedAt, "ru")}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
