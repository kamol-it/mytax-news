import Image from "next/image";
import Link from "next/link";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { AdminPager, pageFromParam } from "@/components/admin/AdminPager";
import { formatDate } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { deleteArticle, toggleArticlePublished } from "../../actions";

const PER_PAGE = 20;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { page: pageParam, q, status } = await searchParams;
  const page = pageFromParam(pageParam);
  const query = (q ?? "").trim();

  const where = {
    ...(status === "published" ? { published: true } : {}),
    ...(status === "draft" ? { published: false } : {}),
    ...(query
      ? {
          OR: [
            { titleRu: { contains: query } },
            { titleUz: { contains: query } },
            { titleEn: { contains: query } },
          ],
        }
      : {}),
  };

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { category: true, author: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">Новости</h1>
        <Link
          href="/admin/articles/new"
          className="ml-auto rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          + Новая новость
        </Link>
      </div>

      <form className="mb-4 flex flex-wrap gap-2 text-sm">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Поиск по заголовку…"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 focus:border-accent focus:outline-none sm:w-56 sm:flex-none"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-lg border border-line bg-surface px-3 py-2"
        >
          <option value="">Все</option>
          <option value="published">Опубликованные</option>
          <option value="draft">Черновики</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-line bg-surface px-4 py-2 font-semibold hover:border-accent hover:text-accent"
        >
          Найти
        </button>
      </form>

      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {articles.length === 0 ? (
          <p className="p-4 text-sm text-muted">Ничего не найдено.</p>
        ) : (
          articles.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-background">
                {a.coverImage ? (
                  <Image
                    src={a.coverImage}
                    alt=""
                    fill
                    sizes="64px"
                    className={
                      a.coverHeight && a.coverWidth && a.coverHeight > a.coverWidth
                        ? "object-cover object-top"
                        : "object-cover"
                    }
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1 basis-40">
                <Link
                  href={`/admin/articles/${a.id}`}
                  className="block truncate font-medium hover:text-accent"
                >
                  {a.titleRu || a.titleUz || a.titleEn}
                </Link>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {a.category?.nameRu ?? "без рубрики"} · {formatDate(a.updatedAt, "ru")} ·{" "}
                  {a.views} просм.
                  {a.videoUrl ? " · видео" : ""}
                </p>
              </div>

              <form action={toggleArticlePublished} className="ml-auto shrink-0">
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    a.published
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                  title="Переключить публикацию"
                >
                  {a.published ? "опубликовано" : "черновик"}
                </button>
              </form>

              {a.published ? (
                <Link
                  href={`/ru/news/${a.slug}`}
                  target="_blank"
                  className="shrink-0 text-xs text-muted hover:text-accent"
                >
                  ↗
                </Link>
              ) : null}

              <form action={deleteArticle} className="shrink-0">
                <input type="hidden" name="id" value={a.id} />
                <ConfirmSubmit
                  message="Удалить новость безвозвратно?"
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

      <AdminPager
        page={page}
        total={total}
        perPage={PER_PAGE}
        basePath="/admin/articles"
        query={{
          ...(query ? { q: query } : {}),
          ...(status ? { status } : {}),
        }}
      />
    </div>
  );
}
