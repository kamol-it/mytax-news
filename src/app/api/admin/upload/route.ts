import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 МБ
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 МБ

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

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });

  // Имя генерируем сами — пользовательское имя файла не участвует в пути.
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${meta.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadsDir, filename), buffer);

  const articleId = String(formData.get("articleId") ?? "").trim() || null;
  const url = `/uploads/${filename}`;

  const media = await prisma.media.create({
    data: {
      url,
      filename: file.name.slice(0, 200),
      mimeType: file.type,
      size: file.size,
      kind: meta.kind,
      articleId,
    },
  });

  return NextResponse.json({ id: media.id, url, kind: meta.kind });
}
