import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Вход в админ-панель" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Проверяем не только cookie, но и наличие пользователя: иначе сессия
  // удалённой учётки гоняла бы браузер между /admin и /admin/login по кругу.
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({ where: { id: session.sub }, select: { id: true } })
    : null;
  if (user) redirect("/admin");

  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <Logo />
          <p className="mt-2 text-sm text-muted">Админ-панель</p>
        </div>
        <LoginForm next={next ?? "/admin"} />
      </div>
    </div>
  );
}
