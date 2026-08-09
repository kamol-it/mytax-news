"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { replyAsVisitor, type AskState } from "../actions";
import type { Locale } from "@/lib/i18n";

const texts: Record<Locale, Record<string, string>> = {
  uz: {
    placeholder: "Xabaringiz…",
    send: "Yuborish",
    sending: "Yuborilmoqda…",
    waiting: "Maslahatchi javobini kutmoqdamiz",
    notify: "Javob kelganda bildirishnoma yuborish",
    notifyOn: "Bildirishnomalar yoqildi",
    closed: "Murojaat yopilgan.",
    you: "Siz",
    consultant: "Maslahatchi",
  },
  ru: {
    placeholder: "Ваше сообщение…",
    send: "Отправить",
    sending: "Отправляем…",
    waiting: "Ждём ответа консультанта",
    notify: "Уведомить меня об ответе",
    notifyOn: "Уведомления включены",
    closed: "Обращение закрыто.",
    you: "Вы",
    consultant: "Консультант",
  },
  en: {
    placeholder: "Your message…",
    send: "Send",
    sending: "Sending…",
    waiting: "Waiting for the consultant",
    notify: "Notify me about the answer",
    notifyOn: "Notifications enabled",
    closed: "The request is closed.",
    you: "You",
    consultant: "Consultant",
  },
};

function base64ToBytes(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

export function Thread({
  token,
  locale,
  answered,
  closed,
}: {
  token: string;
  locale: Locale;
  answered: boolean;
  closed: boolean;
}) {
  const [state, action, pending] = useActionState<AskState, FormData>(replyAsVisitor, {});
  const [notified, setNotified] = useState(false);
  const router = useRouter();
  const t = texts[locale];

  // Ветка обновляется сама, пока страница открыта: ответ появится без перезагрузки
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mytax_threads") ?? "[]") as string[];
      if (!saved.includes(token)) {
        localStorage.setItem("mytax_threads", JSON.stringify([token, ...saved].slice(0, 20)));
      }
    } catch {
      /* localStorage может быть недоступен */
    }
  }, [token]);

  async function enableNotifications() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || !("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), locale, questionToken: token }),
      });
      setNotified(true);
    } catch {
      /* уведомления не критичны для работы ветки */
    }
  }

  if (closed) {
    return <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">{t.closed}</p>;
  }

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-2">
        <input type="hidden" name="token" value={token} />
        <textarea
          name="body"
          rows={3}
          placeholder={t.placeholder}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base focus:border-accent focus:outline-none"
        />
        {state.error ? (
          <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? t.sending : t.send}
          </button>
          {!answered ? <span className="text-sm text-muted">{t.waiting}</span> : null}
        </div>
      </form>

      <button
        type="button"
        onClick={enableNotifications}
        disabled={notified}
        className="text-sm font-semibold text-accent hover:underline disabled:text-emerald-700 disabled:no-underline"
      >
        {notified ? `✓ ${t.notifyOn}` : `🔔 ${t.notify}`}
      </button>
    </div>
  );
}
