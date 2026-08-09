import Link from "next/link";

/** Постраничная навигация для списков админки. */
export function AdminPager({
  page,
  total,
  perPage,
  basePath,
  query = {},
}: {
  page: number;
  total: number;
  perPage: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(query);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  const button =
    "rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-accent hover:text-accent";

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={button}>
          ← Назад
        </Link>
      ) : null}

      <span className="px-1 text-sm text-muted">
        {from}–{to} из {total} · стр. {page}/{totalPages}
      </span>

      {page < totalPages ? (
        <Link href={href(page + 1)} className={button}>
          Вперёд →
        </Link>
      ) : null}
    </nav>
  );
}

/** Разбирает ?page= из строки запроса. */
export function pageFromParam(value: string | undefined): number {
  const page = Number(value ?? 1);
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
}
