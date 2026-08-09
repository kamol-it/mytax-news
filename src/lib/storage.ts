import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Файлы админки хранятся двумя способами:
 * - локально (разработка) — в public/uploads;
 * - на Vercel и других serverless-платформах файловая система только для чтения,
 *   поэтому используется Vercel Blob (включается наличием BLOB_READ_WRITE_TOKEN).
 */
export function usesBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function saveFile(
  filename: string,
  file: File,
): Promise<{ url: string }> {
  if (usesBlobStorage()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`uploads/${filename}`, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  await mkdir(UPLOADS_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return { url: `/uploads/${filename}` };
}

/** Удаление файла; отсутствующий файл не считается ошибкой. */
export async function removeFile(url: string): Promise<void> {
  if (url.startsWith("http")) {
    const { del } = await import("@vercel/blob");
    await del(url).catch(() => undefined);
    return;
  }

  const filePath = path.join(UPLOADS_DIR, path.basename(url));
  if (!filePath.startsWith(UPLOADS_DIR)) return;
  await unlink(filePath).catch(() => undefined);
}
