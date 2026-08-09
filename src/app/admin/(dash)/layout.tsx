import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { prisma } from "@/lib/prisma";
import { logout } from "../actions";

export const metadata = { title: "Админ-панель MYTAX" };

const nav = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/articles", label: "Новости" },
  { href: "/admin/categories", label: "Рубрики" },
  { href: "/admin/pages", label: "Страницы" },
  { href: "/admin/media", label: "Медиафайлы" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/settings", label: "Настройки" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  // Токен живёт 12 часов, поэтому проверяем, что учётка ещё существует:
  // иначе удалённый пользователь сохранял бы доступ до истечения сессии.
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, role: true },
  });
  if (!user) redirect("/admin/login?expired=1");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col bg-ink px-4 py-5 text-white sm:flex">
        <Link href="/admin" className="mb-6">
          <Logo tone="dark" size="sm" />
        </Link>

        <nav className="flex flex-col gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4 text-xs text-white/60">
          <p className="font-semibold text-white/85">{session.name}</p>
          <p className="mb-3 truncate">{session.email}</p>
          <Link href="/" className="block hover:text-white">
            ↗ Открыть сайт
          </Link>
          <form action={logout} className="mt-2">
            <button type="submit" className="text-accent hover:underline">
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1">
        {/* Мобильная шапка админки: клиент работает в основном с телефона */}
        <header className="sticky top-0 z-20 border-b border-line bg-surface sm:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href="/admin">
              <Logo size="sm" />
            </Link>
            <span className="truncate text-xs text-muted">{session.name}</span>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <Link href="/" className="text-muted hover:text-accent">
                ↗ сайт
              </Link>
              <form action={logout}>
                <button type="submit" className="text-accent">
                  Выйти
                </button>
              </form>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg bg-background px-3 py-2 text-sm font-medium text-foreground active:bg-line"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-5 sm:py-6">{children}</div>
      </div>
    </div>
  );
}
