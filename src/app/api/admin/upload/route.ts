import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 МБ
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 МБ

/** Подписи форматов: заявленный MIME от браузера доверять нельзя. */
const MAGIC: { ext: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: "gif", test: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  {
    ext: "webp",
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  // ftyp-контейнеры: mp4, mov, avif — подпись на 4-м байте
  {
    ext: "ftyp",
    test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
  { ext: "webm", test: (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 },
];

function looksLikeMedia(bytes: Uint8Array): boolean {
  return MAGIC.some((m) => m.test(bytes));
}

const ALLOWED: Record<string, { ext: string; kind: "image" | "video" }> = {
  "image/jpeg": { ext: "jpg", kind: "image" },
  "image/png": { ext: "png", kind: "image" },
  "image/webp": { ext: "webp", kind: "image" },
  "image/gif": { ext: "gif", kind: "image" },
  "image/avif": { ext: "avif", kind: "image" },
  "video/mp4": { ext: "mp4", kind: "video" },
  "video/webm": { ext: "webm", kind: "video" },
  "video/quicktime": { ext: "mov", kind: "video" },
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  const meta = ALLOWED[file.type];
  if (!meta) {
    return NextResponse.json(
      { error: `Тип ${file.type || "неизвестный"} не поддерживается` },
      { status: 415 },
    );
  }

  const limit = meta.kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    return NextResponse.json(
      { error: `Файл больше ${Math.round(limit / 1024 / 1024)} МБ` },
      { status: 413 },
    );
  }

  // Проверяем содержимое: html или скрипт, присланный как image/png, не пройдёт
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!looksLikeMedia(head)) {
    return NextResponse.json(
      { error: "Файл не похож на изображение или видео" },
      { status: 415 },
    );
  }

  // Имя генерируем сами — пользовательское имя файла не участвует в пути.
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${meta.ext}`;
  const { url } = await saveFile(filename, file);

  const articleId = String(formData.get("articleId") ?? "").trim() || null;
  // Размеры измеряет браузер при выборе файла — сервер их только сохраняет
  const dimension = (key: string) => {
    const value = Number(formData.get(key));
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  };
  const width = dimension("width");
  const height = dimension("height");

  const media = await prisma.media.create({
    data: {
      url,
      filename: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      kind: meta.kind,
      width,
      height,
      articleId,
    },
  });

  return NextResponse.json({ id: media.id, url, kind: meta.kind, width, height });
}
