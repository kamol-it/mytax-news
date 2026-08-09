"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import { slugify, uniqueSlug } from "@/lib/slug";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login");
}

function refreshPublicPages(slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/admin/articles");
  if (slug) {
    for (const locale of ["uz", "ru", "en"]) {
      revalidatePath(`/${locale}/news/${slug}`);
    }
  }
}

/* ---------------------------------- новости --------------------------------- */

export type ArticleFormState = { error?: string; ok?: boolean };

export async function saveArticle(
  _prev: ArticleFormState,
  formData: FormData,
): Promise<ArticleFormState> {
  const session = await requireSession();

  const id = String(formData.get("id") ?? "").trim();
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const titleRu = text("titleRu");
  const titleUz = text("titleUz");
  const titleEn = text("titleEn");

  if (!titleRu && !titleUz && !titleEn) {
    return { error: "Заголовок нужен хотя бы на одном языке." };
  }

  const categoryId = text("categoryId") || null;
  const published = formData.get("published") === "on";
  const featured = formData.get("featured") === "on";
  const coverImage = text("coverImage") || null;
  const videoUrl = text("videoUrl") || null;

  const data = {
    titleUz: titleUz || titleRu || titleEn,
    titleRu: titleRu || titleUz || titleEn,
    titleEn: titleEn || titleRu || titleUz,
    excerptUz: text("excerptUz"),
    excerptRu: text("excerptRu"),
    excerptEn: text("excerptEn"),
    bodyUz: sanitizeHtml(text("bodyUz")),
    bodyRu: sanitizeHtml(text("bodyRu")),
    bodyEn: sanitizeHtml(text("bodyEn")),
    coverImage,
    videoUrl,
    published,
    featured,
    categoryId,
  };

  let slug: string;

  if (id) {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) return { error: "Новость не найдена." };

    const requested = text("slug");
    slug =
      requested && requested !== existing.slug
        ? await uniqueSlug(requested, async (s) =>
            Boolean(await prisma.article.findFirst({ where: { slug: s, id: { not: id } } })),
          )
        : existing.slug;

    await prisma.article.update({
      where: { id },
      data: {
        ...data,
        slug,
        publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
      },
    });
  } else {
    const base = text("slug") || data.titleRu || data.titleUz;
    slug = await uniqueSlug(slugify(base), async (s) =>
      Boolean(await prisma.article.findUnique({ where: { slug: s } })),
    );

    await prisma.article.create({
      data: {
        ...data,
        slug,
        authorId: session.sub,
        publishedAt: published ? new Date() : null,
      },
    });
  }

  refreshPublicPages(slug);
  redirect("/admin/articles?saved=1");
}

export async function toggleArticlePublished(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return;

  const published = !article.published;
  await prisma.article.update({
    where: { id },
    data: {
      published,
      publishedAt: published ? (article.publishedAt ?? new Date()) : null,
    },
  });
  refreshPublicPages(article.slug);
}

export async function deleteArticle(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) return;

  await prisma.article.delete({ where: { id } });
  refreshPublicPages(article.slug);
  redirect("/admin/articles?deleted=1");
}

/* --------------------------------- рубрики --------------------------------- */

export async function saveCategory(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "").trim();
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const nameRu = text("nameRu");
  const nameUz = text("nameUz");
  const nameEn = text("nameEn");
  if (!nameRu && !nameUz && !nameEn) return;

  const data = {
    nameUz: nameUz || nameRu || nameEn,
    nameRu: nameRu || nameUz || nameEn,
    nameEn: nameEn || nameRu || nameUz,
    position: Number(text("position")) || 0,
  };

  if (id) {
    await prisma.category.update({ where: { id }, data });
  } else {
    const slug = await uniqueSlug(text("slug") || data.nameRu, async (s) =>
      Boolean(await prisma.category.findUnique({ where: { slug: s } })),
    );
    await prisma.category.create({ data: { ...data, slug } });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
}

export async function deleteCategory(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
}

/* -------------------------------- медиафайлы ------------------------------- */

export async function deleteMedia(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return;

  await prisma.media.delete({ where: { id } });

  // Файл лежит в public/uploads; имя из БД, но всё равно нормализуем путь.
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, path.basename(media.url));
  if (filePath.startsWith(uploadsDir)) {
    await unlink(filePath).catch(() => undefined);
  }

  revalidatePath("/admin/media");
}
