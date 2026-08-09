import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, locales } from "@/lib/i18n";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Админка: всё кроме /admin/login требует валидную сессию.
  if (pathname.startsWith("/admin")) {
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
  matcher: ["/((?!api|_next/static|_next/image|uploads|favicon.ico|robots.txt|sitemap.xml).*)"],
};
