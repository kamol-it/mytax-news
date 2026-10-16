// Админка на отдельном поддомене (например in.mytax.uz).
// Задаётся переменной ADMIN_HOST; без неё админка живёт на основном домене по /admin
// (так работают локальная разработка и демо на Vercel).
//
// Модуль без зависимостей от Next и БД: его импортирует proxy и тесты.

export function adminHost(): string | null {
  const host = process.env.ADMIN_HOST?.trim().toLowerCase();
  return host ? host : null;
}

/** Абсолютная ссылка на страницу админки — для push-уведомлений администраторам. */
export function adminUrl(path = "/admin"): string {
  const host = adminHost();
  if (host) return `https://${host}${path}`;
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${path}`;
}

export type HostDecision =
  | { action: "next" }
  | { action: "redirect"; url: string }
  | { action: "not-found" };

/**
 * Что делать с запросом с учётом поддомена админки.
 * - на поддомене: «/» ведёт на /admin, всё публичное — на основной сайт;
 * - на основном домене: /admin не существует (404), чтобы не светить вход.
 */
export function routeByHost(opts: {
  host: string | null;
  pathname: string;
  search: string;
  adminHost: string | null;
  siteUrl: string | undefined;
}): HostDecision {
  const { pathname, search, adminHost, siteUrl } = opts;
  if (!adminHost) return { action: "next" };

  const host = (opts.host ?? "").split(":")[0].toLowerCase();
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (host === adminHost) {
    if (isAdminPath) return { action: "next" };
    if (pathname === "/") return { action: "redirect", url: "/admin" };
    const site = (siteUrl ?? "").replace(/\/+$/, "");
    return { action: "redirect", url: `${site}${pathname}${search}` };
  }

  return isAdminPath ? { action: "not-found" } : { action: "next" };
}
