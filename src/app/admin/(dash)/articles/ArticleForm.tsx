"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import { saveArticle, type ArticleFormState } from "../../actions";
import { UploadField } from "./UploadField";
import { locales, localeNames, type Locale } from "@/lib/i18n";

export type ArticleFormValues = {
  id?: string;
  slug?: string;
  titleUz?: string;
  titleRu?: string;
  titleEn?: string;
  excerptUz?: string;
  excerptRu?: string;
  excerptEn?: string;
  bodyUz?: string;
  bodyRu?: string;
  bodyEn?: string;
  coverImage?: string | null;
  coverWidth?: number | null;
  coverHeight?: number | null;
  videoUrl?: string | null;
  published?: boolean;
  featured?: boolean;
  categoryId?: string | null;
};

type Category = { id: string; nameRu: string };

const suffix = (l: Locale) => `${l[0].toUpperCase()}${l.slice(1)}` as "Uz" | "Ru" | "En";

export function ArticleForm({
  values = {},
  categories,
}: {
  values?: ArticleFormValues;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState<ArticleFormState, FormData>(
    saveArticle,
    {},
  );
  const [tab, setTab] = useState<Locale>("ru");
  const [cover, setCover] = useState(values.coverImage ?? "");
  const [coverSize, setCoverSize] = useState({
    width: values.coverWidth ?? 0,
    height: values.coverHeight ?? 0,
  });
  const [video, setVideo] = useState(values.videoUrl ?? "");
  const bodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  /** Вставляет HTML в текстовое поле активной вкладки на позицию курсора. */
  function insertIntoBody(html: string) {
    const el = bodyRefs.current[tab];
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    el.value = `${el.value.slice(0, start)}${html}${el.value.slice(el.selectionEnd ?? start)}`;
    el.focus();
    el.selectionStart = el.selectionEnd = start + html.length;
  }

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
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-black">
          {values.id ? "Редактирование новости" : "Новая новость"}
        </h1>
        <Link href="/admin/articles" className="text-sm text-muted hover:text-accent">
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

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          {/* Языковые вкладки */}
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
                    defaultValue={values[`title${s}` as keyof ArticleFormValues] as string ?? ""}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-lg font-semibold focus:border-accent focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Анонс ({l})</span>
                  <textarea
                    name={`excerpt${s}`}
                    rows={2}
                    defaultValue={values[`excerpt${s}` as keyof ArticleFormValues] as string ?? ""}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </label>

                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-1">
                    <span className="mr-2 text-sm font-medium">Текст ({l})</span>
                    {[
                      { label: "P", before: "<p>", after: "</p>" },
                      { label: "H2", before: "<h2>", after: "</h2>" },
                      { label: "B", before: "<strong>", after: "</strong>" },
                      { label: "I", before: "<em>", after: "</em>" },
                      { label: "Список", before: "<ul>\n  <li>", after: "</li>\n</ul>" },
                      { label: "Цитата", before: "<blockquote>", after: "</blockquote>" },
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
                    rows={16}
                    ref={(el) => {
                      bodyRefs.current[l] = el;
                    }}
                    defaultValue={values[`body${s}` as keyof ArticleFormValues] as string ?? ""}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm leading-relaxed focus:border-accent focus:outline-none"
                    placeholder="<p>Текст новости…</p>"
                  />
                  <p className="mt-1 text-xs text-muted">
                    Поддерживается HTML. Фото из блока «Медиа» вставляются в текст кнопкой
                    «В текст».
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Боковая панель */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
              Публикация
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="published"
                defaultChecked={values.published ?? false}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Опубликовать
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="sendPush"
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Отправить push-уведомление
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={values.featured ?? false}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Главная новость
            </label>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-medium">Рубрика</span>
              <select
                name="categoryId"
                defaultValue={values.categoryId ?? ""}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              >
                <option value="">— без рубрики —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameRu}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium">URL (slug)</span>
              <input
                name="slug"
                defaultValue={values.slug ?? ""}
                placeholder="сгенерируется автоматически"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
              Обложка
            </h2>
            <input type="hidden" name="coverImage" value={cover} />
            <input type="hidden" name="coverWidth" value={coverSize.width || ""} />
            <input type="hidden" name="coverHeight" value={coverSize.height || ""} />
            <UploadField
              accept="image/*"
              value={cover}
              kind="image"
              articleId={values.id}
              onUploaded={(url, size) => {
                setCover(url);
                setCoverSize(size ?? { width: 0, height: 0 });
              }}
              onClear={() => {
                setCover("");
                setCoverSize({ width: 0, height: 0 });
              }}
            />
            {coverSize.height > coverSize.width && coverSize.width > 0 ? (
              <p className="mt-2 text-xs text-muted">
                Вертикальная картинка: в лентах покажется верхняя часть, на странице
                новости — целиком.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
              Видео
            </h2>
            <input type="hidden" name="videoUrl" value={video} />
            <UploadField
              accept="video/*"
              value={video}
              kind="video"
              articleId={values.id}
              onUploaded={(url) => setVideo(url)}
              onClear={() => setVideo("")}
            />
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-muted">
                …или ссылка на YouTube
              </span>
              <input
                value={video}
                onChange={(e) => setVideo(e.target.value)}
                placeholder="https://youtu.be/…"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          <div className="rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-muted">
              Фото в текст
            </h2>
            <UploadField
              accept="image/*"
              kind="image"
              articleId={values.id}
              buttonLabel="Загрузить и вставить"
              onUploaded={(url) =>
                insertIntoBody(
                  `\n<figure><img src="${url}" alt="" /><figcaption></figcaption></figure>\n`,
                )
              }
            />
            <p className="mt-2 text-xs text-muted">
              Вставится в текст активной языковой вкладки.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
