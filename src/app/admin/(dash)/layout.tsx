import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { logout } from "../actions";

export const metadata = { title: "Админ-панель MYTAX" };

const nav = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/articles", label: "Новости" },
  { href: "/admin/categories", label: "Рубрики" },
  { href: "/admin/media", label: "Медиафайлы" },
  { href: "/admin/users", label: "Пользователи" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col bg-ink px-4 py-5 text-white sm:flex">
        <Link href="/admin" className="mb-6 text-xl font-black tracking-tight">
          <span className="text-accent">MY</span>
          <span className="text-white/85">TAX</span>
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
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:hidden">
          <Link href="/admin" className="text-lg font-black">
            <span className="text-accent">MY</span>TAX
          </Link>
          <nav className="ml-auto flex gap-2 text-xs">
            {nav.slice(1).map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-accent">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </div>
    </div>
  );
}
