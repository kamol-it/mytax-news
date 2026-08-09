"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

const STORAGE_KEY = "mytax_ask_token";

type Message = {
  id: string;
  author: "visitor" | "consultant";
  body: string;
  authorName: string;
  createdAt: string;
};

type Thread = {
  token: string;
  answered: boolean;
  closed: boolean;
  messages: Message[];
};

const texts: Record<Locale, Record<string, string>> = {
  uz: {
    bubble: "Maslahatchidan so‘rang",
    title: "Maslahatchidan so‘rang",
    lead: "Savolingizni yozing — mutaxassis javob beradi. Javob shu oynada ko‘rinadi.",
    name: "Ismingiz",
    contact: "Telefon yoki email",
    topic: "Mavzu (ixtiyoriy)",
    question: "Savolingiz",
    send: "Yuborish",
    sending: "Yuborilmoqda…",
    message: "Xabar…",
    waiting: "Maslahatchi javobini kutmoqdamiz",
    closed: "Murojaat yopilgan.",
    consultant: "Maslahatchi",
    notify: "Javob kelganda xabar bering",
    notifyOn: "Bildirishnomalar yoqildi",
    reset: "Yangi murojaat",
    note: "Javob maslahat tarzida beriladi.",
    close: "Yopish",
  },
  ru: {
    bubble: "Спроси консультанта",
    title: "Спроси консультанта",
    lead: "Напишите вопрос — специалист ответит. Ответ появится в этом же окне.",
    name: "Ваше имя",
    contact: "Телефон или email",
    topic: "Тема (необязательно)",
    question: "Ваш вопрос",
    send: "Отправить",
    sending: "Отправляем…",
    message: "Сообщение…",
    waiting: "Ждём ответа консультанта",
    closed: "Обращение закрыто.",
    consultant: "Консультант",
    notify: "Уведомить об ответе",
    notifyOn: "Уведомления включены",
    reset: "Новое обращение",
    note: "Ответ носит консультационный характер.",
    close: "Закрыть",
  },
  en: {
    bubble: "Ask a consultant",
    title: "Ask a consultant",
    lead: "Write your question — a specialist will reply right in this window.",
    name: "Your name",
    contact: "Phone or email",
    topic: "Topic (optional)",
    question: "Your question",
    send: "Send",
    sending: "Sending…",
    message: "Message…",
    waiting: "Waiting for the consultant",
    closed: "The request is closed.",
    consultant: "Consultant",
    notify: "Notify me about the answer",
    notifyOn: "Notifications enabled",
    reset: "New request",
    note: "The answer is advisory.",
    close: "Close",
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

function time(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Плавающий чат «Спроси консультанта»: кнопка в углу открывает окно,
 * переписка ведётся без перехода на другую страницу. Код ветки хранится
 * в localStorage, поэтому диалог продолжается при следующем визите.
 */
export function AskWidget({ locale }: { locale: Locale }) {
  const t = texts[locale];
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);
  const [unread, setUnread] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastCountRef = useRef(0);

  const load = useCallback(async (token: string, silent = false) => {
    if (!silent) setBusy(true);
    try {
      const res = await fetch(`/api/ask/${token}`, { cache: "no-store" });
      if (res.status === 404) {
        localStorage.removeItem(STORAGE_KEY);
        setThread(null);
        return;
      }
      const data = (await res.json()) as Thread;
      setThread(data);

      // отметка «есть новое», если пришёл ответ, пока окно закрыто
      const answers = data.messages.filter((m) => m.author === "consultant").length;
      if (lastCountRef.current && answers > lastCountRef.current) setUnread(true);
      lastCountRef.current = answers;
    } catch {
      /* сеть могла пропасть — попробуем на следующем опросе */
    } finally {
      if (!silent) setBusy(false);
    }
  }, []);

  // восстановление ветки при загрузке страницы: запрос уходит асинхронно,
  // чтобы не менять состояние синхронно в теле эффекта
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) return;
    const timer = setTimeout(() => void load(token, true), 0);
    return () => clearTimeout(timer);
  }, [load]);

  // опрос: часто при открытом окне, редко при закрытом
  useEffect(() => {
    if (!thread?.token) return;
    const interval = open ? 10000 : 60000;
    const timer = setInterval(() => void load(thread.token, true), interval);
    return () => clearInterval(timer);
  }, [thread?.token, open, load]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setUnread(false);
      bottomRef.current?.scrollIntoView({ block: "end" });
    }, 0);
    return () => clearTimeout(timer);
  }, [open, thread?.messages.length]);

  async function start(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          contact: formData.get("contact"),
          topic: formData.get("topic"),
          body: formData.get("body"),
          locale,
        }),
      });
      const data = (await res.json()) as Thread & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось отправить");
      localStorage.setItem(STORAGE_KEY, data.token);
      lastCountRef.current = 0;
      setThread(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  async function send(formData: FormData) {
    if (!thread) return;
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ask/${thread.token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as Thread & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Не удалось отправить");
      setThread(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || !thread || !("serviceWorker" in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      if ((await Notification.requestPermission()) !== "granted") return;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...subscription.toJSON(), locale, questionToken: thread.token }),
      });
      setNotified(true);
    } catch {
      /* уведомления не обязательны */
    }
  }

  const field =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base focus:border-accent focus:outline-none";

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.title}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-ink/25 transition hover:bg-accent-hover active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <path d="M12 3c-4.97 0-9 3.36-9 7.5 0 2.3 1.24 4.35 3.2 5.73L5.5 20l3.7-1.9c.9.23 1.84.4 2.8.4 4.97 0 9-3.36 9-7.5S16.97 3 12 3Z" />
          </svg>
          <span className="hidden sm:inline">{t.bubble}</span>
          {unread ? (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-white" />
          ) : null}
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[380px]">
          <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:max-h-[70vh] sm:rounded-2xl">
            <header className="flex items-center gap-2 bg-gradient-to-r from-ink-dark to-ink px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{t.title}</p>
                <p className="truncate text-xs text-white/70">
                  {thread ? (thread.answered ? "MYTAX" : t.waiting) : t.lead}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.close}
                className="ml-auto rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!thread ? (
                <form action={start} className="space-y-2">
                  <p className="text-sm text-muted">{t.lead}</p>
                  <input name="name" placeholder={t.name} className={field} autoComplete="name" />
                  <input name="contact" placeholder={t.contact} className={field} />
                  <input name="topic" placeholder={t.topic} className={field} />
                  <textarea name="body" rows={4} placeholder={t.question} className={field} />
                  {error ? <p className="text-sm text-accent">{error}</p> : null}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-white disabled:opacity-60"
                  >
                    {busy ? t.sending : t.send}
                  </button>
                  <p className="text-xs text-muted">{t.note}</p>
                </form>
              ) : (
                <div className="space-y-2">
                  {thread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.author === "consultant"
                          ? "max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-background p-2.5"
                          : "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent/10 p-2.5"
                      }
                    >
                      <p className="mb-0.5 text-[11px] font-semibold text-muted">
                        {m.author === "consultant" ? m.authorName || t.consultant : m.authorName}
                        {" · "}
                        {time(m.createdAt)}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {thread ? (
              <footer className="border-t border-line px-4 py-3">
                {thread.closed ? (
                  <p className="text-sm text-muted">{t.closed}</p>
                ) : (
                  <form action={send} className="flex items-end gap-2">
                    <textarea
                      name="body"
                      rows={2}
                      placeholder={t.message}
                      className="min-h-11 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-base focus:border-accent focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      aria-label={t.send}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-60"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z" />
                      </svg>
                    </button>
                  </form>
                )}
                {error ? <p className="mt-1 text-xs text-accent">{error}</p> : null}
                <button
                  type="button"
                  onClick={enableNotifications}
                  disabled={notified}
                  className="mt-2 text-xs font-semibold text-accent disabled:text-emerald-700"
                >
                  {notified ? `✓ ${t.notifyOn}` : `🔔 ${t.notify}`}
                </button>
              </footer>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
