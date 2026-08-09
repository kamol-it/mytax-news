"use client";

import { useState } from "react";

const icons = {
  telegram:
    "M21.9 4.3 19 19.2c-.2 1-.8 1.2-1.6.8l-4.4-3.3-2.1 2c-.2.2-.4.4-.9.4l.3-4.5 8.2-7.4c.4-.3-.1-.5-.6-.2L7.8 13.2 3.4 11.8c-1-.3-1-1 .2-1.4l17-6.6c.8-.3 1.5.2 1.3 1.5Z",
  facebook:
    "M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.2-1.5 1.5-1.5h1.7V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.3H7.6V13h2.7v8h3.2Z",
  x: "M17.5 3h3.3l-7.2 8.2L21.5 21h-6l-4.4-5.8L5.9 21H2.6l7.6-8.7L2.8 3h6.1l4.1 5.4L17.5 3Zm-1.1 16h1.8L7.4 4.8H5.5L16.4 19Z",
  link: "M10.6 13.4a1 1 0 0 1 0-1.4l1.4-1.4a1 1 0 0 1 1.4 1.4l-1.4 1.4a1 1 0 0 1-1.4 0Zm-2.2 4.4a4 4 0 0 1 0-5.7l2.1-2.1 1.4 1.4-2.1 2.1a2 2 0 0 0 2.8 2.8l2.1-2.1 1.4 1.4-2.1 2.1a4 4 0 0 1-5.6 0Zm7.2-7.2-1.4-1.4 2.1-2.1a2 2 0 1 0-2.8-2.8l-2.1 2.1L9.9 5l2.1-2.1a4 4 0 0 1 5.7 5.7l-2.1 2.1Z",
  check: "M9.6 16.6 5 12l1.4-1.4 3.2 3.2 8-8L19 7.2l-9.4 9.4Z",
  share:
    "M18 16.1c-.8 0-1.5.3-2 .8l-7.1-4.2c0-.2.1-.4.1-.7s0-.5-.1-.7L16 7.1c.5.5 1.2.8 2 .8a2.9 2.9 0 1 0-2.9-2.9c0 .3 0 .5.1.7L8.1 9.9a2.9 2.9 0 1 0 0 4.2l7.1 4.2c0 .2-.1.4-.1.6a2.9 2.9 0 1 0 2.9-2.8Z",
};

/** Кнопки «поделиться» иконками. На телефоне первая кнопка открывает системное меню. */
export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const button =
    "flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:border-accent hover:text-accent";

  function href(kind: "telegram" | "facebook" | "x"): string {
    const url = encodeURIComponent(typeof window === "undefined" ? "" : window.location.href);
    const text = encodeURIComponent(title);
    if (kind === "telegram") return `https://t.me/share/url?url=${url}&text=${text}`;
    if (kind === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    return `https://x.com/intent/tweet?url=${url}&text=${text}`;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* буфер обмена недоступен */
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href }).catch(() => undefined);
      return;
    }
    await copy();
  }

  const Icon = ({ d }: { d: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d={d} />
    </svg>
  );

  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-line pt-5">
      <span className="mr-1 text-xs font-bold uppercase tracking-widest text-muted">
        Поделиться
      </span>

      <button
        type="button"
        onClick={nativeShare}
        aria-label="Отправить"
        title="Отправить"
        className={`${button} sm:hidden`}
      >
        <Icon d={icons.share} />
      </button>

      {(["telegram", "facebook", "x"] as const).map((kind) => (
        <a
          key={kind}
          className={button}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={kind === "x" ? "X" : kind === "telegram" ? "Telegram" : "Facebook"}
          title={kind === "x" ? "X" : kind === "telegram" ? "Telegram" : "Facebook"}
          href={href(kind)}
          onClick={(event) => {
            event.currentTarget.href = href(kind);
          }}
        >
          <Icon d={icons[kind]} />
        </a>
      ))}

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Ссылка скопирована" : "Копировать ссылку"}
        title={copied ? "Ссылка скопирована" : "Копировать ссылку"}
        className={copied ? `${button} border-accent text-accent` : button}
      >
        <Icon d={copied ? icons.check : icons.link} />
      </button>
    </div>
  );
}
