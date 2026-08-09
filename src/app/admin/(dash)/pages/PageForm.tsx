"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { savePage, type PageFormState } from "../../actions";
import { locales, localeNames, type Locale } from "@/lib/i18n";

export type PageFormValues = {
  id?: string;
  slug?: string;
  titleUz?: string;
  titleRu?: string;
  titleEn?: string;
  bodyUz?: string;
  bodyRu?: string;
  bodyEn?: string;
  published?: boolean;
  position?: number;
};

const suffix = (l: Locale) => `${l[0].toUpperCase()}${l.slice(1)}` as "Uz" | "Ru" | "En";

const field =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 focus:border-accent focus:outline-none";

export function PageForm({ values = {} }: { values?: PageFormValues }) {
  const [state, action, pending] = useActionState<PageFormState, FormData>(savePage, {});
  const [tab, setTab] = useState<Locale>("ru");
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function wrapSelection(before: string, after: string) {
    const el = bodyRefs.current[tab];
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = el.value.slice(start, end);
    el.value = `${el.value.slice(0, start)}${before}${selected}${after}${el.value.slice(end)}`;
    el.focus();
    el.selectionStart = start + before.length;
    el.selectionEnd = start + before.length + selected.length;
  }

  return (
    <form action={action} className="space-y-5">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">
          {values.id ? "Редактирование страницы" : "Новая страница"}
        </h1>
        <Link href="/admin/pages" className="text-sm text-muted hover:text-accent">
          ← к списку
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>

      {state.error ? (
        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{state.error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="published"
            defaultChecked={values.published ?? true}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          Показывать на сайте
        </label>
        <label className="flex items-center gap-2">
          Порядок в меню
          <input
            name="position"
            type="number"
            defaultValue={values.position ?? 0}
            className="w-20 rounded-lg border border-line px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2">
          URL
          <input
            name="slug"
            defaultValue={values.slug ?? ""}
            placeholder="about"
            className="w-48 rounded-lg border border-line px-2 py-1 font-mono text-xs"
          />
        </label>
      </div>

      <div className="flex gap-1 border-b border-line">
        {locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setTab(l)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
              tab === l
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {localeNames[l]}
          </button>
        ))}
      </div>

      {locales.map((l) => {
        const s = suffix(l);
        return (
          <div key={l} className={tab === l ? "space-y-4" : "hidden"}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Заголовок ({l})</span>
              <input
                name={`title${s}`}
                defaultValue={(values[`title${s}` as keyof PageFormValues] as string) ?? ""}
                className={`${field} text-lg font-semibold`}
              />
            </label>

            <div>
              <div className="mb-1 flex flex-wrap items-center gap-1">
                <span className="mr-2 text-sm font-medium">Текст ({l})</span>
                {[
                  { label: "P", before: "<p>", after: "</p>" },
                  { label: "H2", before: "<h2>", after: "</h2>" },
                  { label: "B", before: "<strong>", after: "</strong>" },
                  { label: "Список", before: "<ul>\n  <li>", after: "</li>\n</ul>" },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => wrapSelection(btn.before, btn.after)}
                    className="rounded border border-line bg-surface px-2 py-0.5 text-xs hover:border-accent hover:text-accent"
                  >
                    {btn.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt("Ссылка (URL):", "https://");
                    if (url) wrapSelection(`<a href="${url}" rel="noopener">`, "</a>");
                  }}
                  className="rounded border border-line bg-surface px-2 py-0.5 text-xs hover:border-accent hover:text-accent"
                >
                  Ссылка
                </button>
              </div>
              <textarea
                name={`body${s}`}
                rows={14}
                ref={(el) => {
                  bodyRefs.current[l] = el;
                }}
                defaultValue={(values[`body${s}` as keyof PageFormValues] as string) ?? ""}
                className={`${field} font-mono text-sm leading-relaxed`}
                placeholder="<p>Текст страницы…</p>"
              />
            </div>
          </div>
        );
      })}
    </form>
  );
}
