"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const STORAGE_KEY = "mytax_push_prompt";

const texts: Record<Locale, { title: string; body: string; yes: string; no: string; ok: string }> = {
  uz: {
    title: "Yangiliklardan xabardor bo‘ling",
    body: "Muhim soliq yangiliklari chiqqanda brauzerda bildirishnoma yuboramiz.",
    yes: "Yoqish",
    no: "Kerak emas",
    ok: "Bildirishnomalar yoqildi",
  },
  ru: {
    title: "Не пропускайте новости",
    body: "Пришлём уведомление в браузере, когда выйдет важная налоговая новость.",
    yes: "Включить",
    no: "Не сейчас",
    ok: "Уведомления включены",
  },
  en: {
    title: "Stay up to date",
    body: "We will send a browser notification when important tax news is published.",
    yes: "Enable",
    no: "Not now",
    ok: "Notifications enabled",
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

/**
 * Ненавязчивое предложение включить push: показывается через несколько секунд
 * и только один раз. Системное окно браузера открывается лишь по кнопке —
 * иначе браузеры блокируют повторные запросы навсегда.
 */
export function PushPrompt({ locale }: { locale: Locale }) {
  const [visible, setVisible] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = texts[locale];

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setVisible(true), 6000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  }

  async function enable() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        localStorage.setItem(STORAGE_KEY, "denied");
        setVisible(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
        ),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), locale }),
      });
      if (!res.ok) throw new Error("subscribe failed");

      localStorage.setItem(STORAGE_KEY, "granted");
      setDone(true);
      setTimeout(() => setVisible(false), 2500);
    } catch {
      setError("Не удалось включить уведомления");
      setTimeout(() => setVisible(false), 2500);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 sm:left-auto sm:right-5 sm:bottom-24 sm:w-80">
      <div className="rounded-xl border border-line bg-surface p-4 shadow-xl">
        {done ? (
          <p className="text-sm font-semibold text-emerald-700">{t.ok}</p>
        ) : error ? (
          <p className="text-sm text-accent">{error}</p>
        ) : (
          <>
            <p className="text-sm font-bold">{t.title}</p>
            <p className="mt-1 text-sm text-muted">{t.body}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={enable}
                className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                {t.yes}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted hover:text-foreground"
              >
                {t.no}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
