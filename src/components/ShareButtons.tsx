"use client";

import { useState } from "react";

/** Кнопки «поделиться» под новостью. На телефоне использует системное меню. */
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window === "undefined" ? "" : window.location.href;
  const encoded = () => encodeURIComponent(window.location.href);
  const encodedTitle = encodeURIComponent(title);

  const item =
    "rounded-lg border border-line bg-surface px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-accent";

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href }).catch(() => undefined);
      return;
    }
    await copy();
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* буфер обмена недоступен — ничего не делаем */
    }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5">
      <span className="mr-1 text-xs font-bold uppercase tracking-widest text-muted">
        Поделиться
      </span>

      <button type="button" onClick={nativeShare} className={`${item} sm:hidden`}>
        Отправить
      </button>

      <a
        className={item}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodedTitle}`}
        onClick={(e) => {
          e.currentTarget.href = `https://t.me/share/url?url=${encoded()}&text=${encodedTitle}`;
        }}
      >
        Telegram
      </a>

      <a
        className={item}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://www.facebook.com/sharer/sharer.php?u=${encoded()}`;
        }}
      >
        Facebook
      </a>

      <a
        className={item}
        target="_blank"
        rel="noopener noreferrer"
        href={`https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodedTitle}`}
        onClick={(e) => {
          e.currentTarget.href = `https://x.com/intent/tweet?url=${encoded()}&text=${encodedTitle}`;
        }}
      >
        X
      </a>

      <button type="button" onClick={copy} className={item}>
        {copied ? "Ссылка скопирована" : "Копировать ссылку"}
      </button>
    </div>
  );
}
