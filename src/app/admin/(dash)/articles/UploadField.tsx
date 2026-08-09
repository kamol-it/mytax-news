"use client";

import { useRef, useState } from "react";

export function UploadField({
  accept,
  kind,
  value,
  articleId,
  buttonLabel = "Выбрать файл",
  onUploaded,
  onClear,
}: {
  accept: string;
  kind: "image" | "video";
  value?: string;
  articleId?: string;
  buttonLabel?: string;
  onUploaded: (url: string, size?: { width: number; height: number }) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Размеры изображения нужны, чтобы вертикальные картинки не обрезались. */
  async function measure(file: File): Promise<{ width: number; height: number } | null> {
    if (!file.type.startsWith("image/")) return null;
    try {
      const bitmap = await createImageBitmap(file);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      return null;
    }
  }

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const size = await measure(file);
      const body = new FormData();
      body.set("file", file);
      if (articleId) body.set("articleId", articleId);
      if (size) {
        body.set("width", String(size.width));
        body.set("height", String(size.height));
      }

      const res = await fetch("/api/admin/upload", { method: "POST", body });
      if (res.status === 413) {
        throw new Error(
          "Хостинг не принял файл: слишком большой. Уменьшите размер или загрузите видео ссылкой на YouTube.",
        );
      }
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        width?: number | null;
        height?: number | null;
      };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Ошибка загрузки");
      onUploaded(
        data.url,
        data.width && data.height ? { width: data.width, height: data.height } : undefined,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // локальный путь /uploads/… или ссылка на Vercel Blob
  const isUploaded = Boolean(
    value && (value.startsWith("/uploads/") || value.includes("blob.vercel-storage.com")),
  );

  return (
    <div>
      {isUploaded && kind === "image" ? (
        // Файл из локальной папки uploads; обычный <img> здесь достаточен
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mb-2 aspect-video w-full rounded-lg object-cover"
        />
      ) : null}
      {isUploaded && kind === "video" ? (
        <video src={value} controls className="mb-2 w-full rounded-lg bg-black" />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {busy ? "Загрузка…" : buttonLabel}
        </button>
        {value && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2 py-1.5 text-xs text-muted hover:text-accent"
          >
            Убрать
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-accent">{error}</p> : null}
    </div>
  );
}
