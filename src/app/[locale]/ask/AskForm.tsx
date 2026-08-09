"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitQuestion, type AskState } from "./actions";
import type { Locale } from "@/lib/i18n";

const texts: Record<Locale, Record<string, string>> = {
  uz: {
    name: "Ismingiz",
    contact: "Telefon yoki email",
    topic: "Mavzu (masalan, QQS)",
    body: "Savolingiz",
    submit: "Savol yuborish",
    sending: "Yuborilmoqda…",
    note: "Javob maslahat tarzida beriladi va rasmiy hujjat o‘rnini bosmaydi.",
  },
  ru: {
    name: "Ваше имя",
    contact: "Телефон или email",
    topic: "Тема (например, НДС)",
    body: "Ваш вопрос",
    submit: "Отправить вопрос",
    sending: "Отправляем…",
    note: "Ответ носит консультационный характер и не заменяет официальный документ.",
  },
  en: {
    name: "Your name",
    contact: "Phone or email",
    topic: "Topic (e.g. VAT)",
    body: "Your question",
    submit: "Send question",
    sending: "Sending…",
    note: "The answer is advisory and does not replace an official document.",
  },
};

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base focus:border-accent focus:outline-none";

/** Первое обращение: после отправки уводим посетителя в его ветку диалога. */
export function AskForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState<AskState, FormData>(submitQuestion, {});
  const router = useRouter();
  const t = texts[locale];

  useEffect(() => {
    if (!state.token) return;
    try {
      const saved = JSON.parse(localStorage.getItem("mytax_threads") ?? "[]") as string[];
      if (!saved.includes(state.token)) {
        localStorage.setItem("mytax_threads", JSON.stringify([state.token, ...saved].slice(0, 20)));
      }
    } catch {
      /* localStorage может быть недоступен */
    }
    router.push(`/${locale}/ask/${state.token}`);
  }, [state.token, locale, router]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" placeholder={t.name} className={field} autoComplete="name" />
        <input name="contact" placeholder={t.contact} className={field} autoComplete="on" />
      </div>
      <input name="topic" placeholder={t.topic} className={field} />
      <textarea name="body" rows={6} placeholder={t.body} className={field} />

      {state.error ? (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-hover disabled:opacity-60 sm:w-auto"
      >
        {pending ? t.sending : t.submit}
      </button>

      <p className="text-xs text-muted">{t.note}</p>
    </form>
  );
}
