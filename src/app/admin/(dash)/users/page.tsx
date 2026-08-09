import { redirect } from "next/navigation";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { deleteUser } from "../../actions";
import { AdminPager, pageFromParam } from "@/components/admin/AdminPager";
import {
  ChangeOwnPasswordForm,
  CreateUserForm,
  ResetPasswordForm,
} from "./UserForms";

export const metadata = { title: "Пользователи" };

const PER_PAGE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  // Редактор видит только смену собственного пароля
  if (session.role !== "ADMIN") {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-black">Мой доступ</h1>
        <p className="text-sm text-muted">
          Управление пользователями доступно только администратору.
        </p>
        <ChangeOwnPasswordForm />
      </div>
    );
  }

  const page = pageFromParam((await searchParams).page);

  const [total, admins, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { articles: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Пользователи</h1>

      <CreateUserForm />

      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {users.map((u) => {
          const isSelf = u.id === session.sub;
          const lastAdmin = u.role === "ADMIN" && admins <= 1;

          return (
            <div key={u.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{u.name}</span>
                <span className="text-sm text-muted">{u.email}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    u.role === "ADMIN"
                      ? "bg-accent/10 text-accent"
                      : "bg-background text-muted"
                  }`}
                >
                  {u.role === "ADMIN" ? "администратор" : "редактор"}
                </span>
                {isSelf ? <span className="text-xs text-muted">— это вы</span> : null}
                <span className="ml-auto text-xs text-muted">
                  новостей: {u._count.articles} · с {formatDate(u.createdAt, "ru")}
                </span>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <ResetPasswordForm userId={u.id} email={u.email} />

                {isSelf || lastAdmin ? (
                  <span className="text-xs text-muted">
                    {isSelf
                      ? "себя удалить нельзя"
                      : "нельзя удалить последнего администратора"}
                  </span>
                ) : (
                  <form action={deleteUser}>
                    <input type="hidden" name="id" value={u.id} />
                    <ConfirmSubmit
                      message={`Удалить пользователя ${u.email}? Его новости останутся на сайте.`}
                      className="text-xs text-muted hover:text-accent"
                    >
                      Удалить пользователя
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AdminPager page={page} total={total} perPage={PER_PAGE} basePath="/admin/users" />

      <div className="max-w-lg">
        <ChangeOwnPasswordForm />
      </div>
    </div>
  );
}
