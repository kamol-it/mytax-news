"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

/** Считает пустым как "", так и «<p></p>» от редактора. */
function isBlank(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim() === "";
}

/**
 * WYSIWYG-редактор для админки: текст набирается как в документе,
 * HTML уходит в скрытое поле формы под именем `name`.
 * Кнопки крупные — редактор рассчитан и на работу с телефона.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
  articleId,
  placeholder = "Текст…",
}: {
  name: string;
  defaultValue?: string;
  articleId?: string;
  placeholder?: string;
}) {
  // «<p></p>» от пустого редактора в базу не нужен
  const [html, setHtml] = useState(isBlank(defaultValue) ? "" : defaultValue);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    // Next рендерит компонент на сервере, поэтому первый рендер откладываем
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class:
          "prose-news min-h-[280px] w-full rounded-b-lg border border-t-0 border-line bg-surface px-3 py-3 focus:outline-none sm:min-h-[360px]",
      },
    },
    onUpdate: ({ editor: e }) => setHtml(e.isEmpty ? "" : e.getHTML()),
  });

  async function uploadImage(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      if (articleId) body.set("articleId", articleId);
      try {
        const bitmap = await createImageBitmap(file);
        body.set("width", String(bitmap.width));
        body.set("height", String(bitmap.height));
        bitmap.close();
      } catch {
        /* размеры не критичны */
      }

      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Ошибка загрузки");
      editor.chain().focus().setImage({ src: data.url, alt: "" }).run();
      setHtml(editor.getHTML());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={html} />

      <Toolbar
        editor={editor}
        uploading={uploading}
        onPickImage={() => fileRef.current?.click()}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadImage(file);
        }}
      />

      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className="min-h-[280px] rounded-b-lg border border-t-0 border-line bg-surface px-3 py-3 text-sm text-muted">
          {placeholder}
        </div>
      )}
    </div>
  );
}

function Toolbar({
  editor,
  uploading,
  onPickImage,
}: {
  editor: Editor | null;
  uploading: boolean;
  onPickImage: () => void;
}) {
  if (!editor) {
    return (
      <div className="h-11 rounded-t-lg border border-line bg-background" aria-hidden="true" />
    );
  }
  return <ToolbarButtons editor={editor} uploading={uploading} onPickImage={onPickImage} />;
}

function ToolbarButtons({
  editor,
  uploading,
  onPickImage,
}: {
  editor: Editor;
  uploading: boolean;
  onPickImage: () => void;
}) {

  const button = (active: boolean) =>
    `flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold transition ${
      active
        ? "bg-accent text-white"
        : "bg-surface text-foreground/75 hover:bg-line active:bg-line"
    }`;

  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Ссылка (URL). Пустое поле уберёт ссылку:", previous ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-line bg-background p-1.5">
      <button
        type="button"
        title="Полужирный"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={button(editor.isActive("bold"))}
      >
        <span className="font-black">B</span>
      </button>
      <button
        type="button"
        title="Курсив"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={button(editor.isActive("italic"))}
      >
        <span className="italic">I</span>
      </button>
      <span className="mx-1 h-6 w-px bg-line" />

      <button
        type="button"
        title="Подзаголовок"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={button(editor.isActive("heading", { level: 2 }))}
      >
        H2
      </button>
      <button
        type="button"
        title="Подзаголовок меньше"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={button(editor.isActive("heading", { level: 3 }))}
      >
        H3
      </button>
      <button
        type="button"
        title="Обычный абзац"
        onClick={() => editor.chain().focus().setParagraph().run()}
        className={button(editor.isActive("paragraph"))}
      >
        ¶
      </button>
      <span className="mx-1 h-6 w-px bg-line" />

      <button
        type="button"
        title="Список"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={button(editor.isActive("bulletList"))}
      >
        • —
      </button>
      <button
        type="button"
        title="Нумерованный список"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={button(editor.isActive("orderedList"))}
      >
        1.
      </button>
      <button
        type="button"
        title="Цитата"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={button(editor.isActive("blockquote"))}
      >
        ❝
      </button>
      <span className="mx-1 h-6 w-px bg-line" />

      <button
        type="button"
        title="Ссылка"
        onClick={setLink}
        className={button(editor.isActive("link"))}
      >
        🔗
      </button>
      <button
        type="button"
        title="Вставить фото"
        onClick={onPickImage}
        disabled={uploading}
        className={`${button(false)} disabled:opacity-60`}
      >
        {uploading ? "…" : "🖼"}
      </button>
      <span className="mx-1 h-6 w-px bg-line" />

      <button
        type="button"
        title="Отменить"
        onClick={() => editor.chain().focus().undo().run()}
        className={button(false)}
      >
        ↶
      </button>
      <button
        type="button"
        title="Повторить"
        onClick={() => editor.chain().focus().redo().run()}
        className={button(false)}
      >
        ↷
      </button>
      <button
        type="button"
        title="Убрать форматирование"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        className={`${button(false)} ml-auto text-xs text-muted`}
      >
        Очистить стиль
      </button>
    </div>
  );
}
