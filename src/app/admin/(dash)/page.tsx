import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/i18n";

export default async function AdminDashboard() {
  const [total, published, drafts, categories, mediaCount, recent] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { published: true } }),
    prisma.article.count({ where: { published: false } }),
    prisma.category.count(),
    prisma.media.count(),
    prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { category: true },
    }),
  ]);

  const stats = [
    { label: "Всего новостей", value: total },
    { label: "Опубликовано", value: published },
    { label: "Черновики", value: drafts },
    { label: "Рубрик", value: categories },
    { label: "Медиафайлов", value: mediaCount },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Обзор</h1>
        <Link
          href="/admin/articles/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          + Новая новость
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-2xl font-black">{s.value}</p>
            <p className="mt-1 text-xs text-muted">{s.label}</p>
          </div>
        ))}
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
