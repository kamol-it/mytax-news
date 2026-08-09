import Link from "next/link";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatDate } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { deletePage } from "../../actions";

export const metadata = { title: "Страницы" };

export default async function PagesListPage() {
  const pages = await prisma.page.findMany({
    orderBy: [{ position: "asc" }, { titleRu: "asc" }],
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">Страницы</h1>
        <Link
          href="/admin/pages/new"
          className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          + Новая страница
        </Link>
      </div>

      <p className="mb-4 text-sm text-muted">
        Статические страницы — «О нас», «Контакты», «Реклама». Появляются в меню сайта
        и в подвале.
      </p>

      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {pages.length === 0 ? (
          <p className="p-4 text-sm text-muted">Страниц пока нет.</p>
        ) : (
          pages.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  p.published ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/pages/${p.id}`}
                  className="block truncate font-medium hover:text-accent"
                >
                  {p.titleRu || p.titleUz || p.titleEn}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted">
                  /pages/{p.slug} · изменено {formatDate(p.updatedAt, "ru")}
                </p>
              </div>

              {p.published ? (
                <Link
                  href={`/ru/pages/${p.slug}`}
                  target="_blank"
                  className="shrink-0 text-xs text-muted hover:text-accent"
                >
                  ↗
                </Link>
              ) : null}

              <form action={deletePage} className="shrink-0">
                <input type="hidden" name="id" value={p.id} />
                <ConfirmSubmit
                  message={`Удалить страницу «${p.titleRu}»?`}
                  title="Удалить"
                  className="text-xs text-muted hover:text-accent"
                >
                  ✕
                </ConfirmSubmit>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
