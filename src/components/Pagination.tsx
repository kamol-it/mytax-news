import Link from "next/link";
import { getDictionary, type Locale } from "@/lib/i18n";

export function Pagination({
  locale,
  page,
  totalPages,
  basePath,
  query = {},
}: {
  locale: Locale;
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const t = getDictionary(locale);

  const href = (p: number) => {
    const params = new URLSearchParams(query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="rounded-lg border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent"
        >
          ← {t.prev}
        </Link>
      ) : null}
      <span className="px-2 text-muted">
        {t.page} {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="rounded-lg border border-line bg-surface px-3 py-2 hover:border-accent hover:text-accent"
        >
          {t.next} →
        </Link>
      ) : null}
    </nav>
  );
}
