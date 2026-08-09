import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings, SOCIAL_KEYS } from "@/lib/settings";
import { pushConfigured } from "@/lib/push";
import { saveSettings, sendTestPush } from "../../actions";

export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== "ADMIN") redirect("/admin");

  const [settings, subscribers] = await Promise.all([
    getSettings(),
    prisma.pushSubscription.count(),
  ]);

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Настройки</h1>

      <form action={saveSettings} className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-muted">
          Соцсети и контакты
        </h2>
        <p className="mb-4 text-sm text-muted">
          Заполненные ссылки появляются иконками в шапке и подвале сайта. Пустые поля
          не показываются.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_KEYS.map((item) => (
            <label key={item.key} className="block">
              <span className="mb-1 block text-sm font-medium">{item.label}</span>
              <input
                name={item.key}
                defaultValue={settings[item.key] ?? ""}
                placeholder={item.placeholder}
                className={field}
                inputMode="url"
              />
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Сохранить
        </button>
      </form>

      <div className="rounded-xl border border-line bg-surface p-4">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-muted">
          Push-уведомления
        </h2>
        {pushConfigured() ? (
          <>
            <p className="text-sm text-muted">
              Подписчиков: <span className="font-semibold text-foreground">{subscribers}</span>.
              Уведомление уходит при сохранении новости, если отмечена галочка
              «Отправить push-уведомление».
            </p>
            <form action={sendTestPush} className="mt-3">
              <button
                type="submit"
                className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
              >
                Отправить проверочное уведомление
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-accent">
            Не заданы ключи VAPID: добавьте NEXT_PUBLIC_VAPID_PUBLIC_KEY и VAPID_PRIVATE_KEY
            в переменные окружения.
          </p>
        )}
      </div>
    </div>
  );
}
