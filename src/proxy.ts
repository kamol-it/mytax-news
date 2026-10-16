import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales } from "@/lib/i18n";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { adminHost, routeByHost } from "@/lib/admin-host";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 0. Поддомен админки (ADMIN_HOST): админка только там, на основном домене её нет.
  const byHost = routeByHost({
    host: request.headers.get("host"),
    pathname,
    search,
    adminHost: adminHost(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (byHost.action === "redirect") {
    return NextResponse.redirect(new URL(byHost.url, request.url));
  }
  // На основном домене /admin — обычный несуществующий адрес: дальше он получит
  // префикс локали (/ru/admin) и страницу 404, как любая опечатка в адресе.
  // Rewrite здесь не годится: за nginx Next проксирует его на https://localhost
  // и падает с EPROTO.
  const adminHere = byHost.action !== "not-found";

  // 1. Админка: всё кроме /admin/login требует валидную сессию.
  if (adminHere && pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();

    const session = await verifySession(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2. Публичная часть: добавляем префикс локали, если его нет.
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) return NextResponse.next();

  const preferred = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

function pickLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    const short = tag.split("-")[0];
    if (locales.includes(short as (typeof locales)[number])) return short;
  }
  return defaultLocale;
}

export const config = {
  // Пропускаем api, служебные пути Next и любые файлы с расширением:
  // sw.js, manifest.webmanifest, иконки и картинки не должны уезжать на /uz/...
  matcher: ["/((?!api|_next/static|_next/image|uploads|.*\\.[a-zA-Z0-9]+$).*)"],
};
