"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToAll } from "@/lib/push";
import { SOCIAL_KEYS } from "@/lib/settings";
import { removeFile } from "@/lib/storage";
import { sanitizeHtml } from "@/lib/sanitize";
import { slugify, uniqueSlug } from "@/lib/slug";

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** Управление пользователями доступно только роли ADMIN. */
async function requireAdmin() {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/admin?forbidden=1");
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
  const size = (key: string) => {
    const value = Number(text(key));
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  };
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
    coverWidth: coverImage ? size("coverWidth") : null,
    coverHeight: coverImage ? size("coverHeight") : null,
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

  // Уведомление подписчикам — только по явной галочке и только для опубликованных
  let pushed = "";
  if (published && formData.get("sendPush") === "on") {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const result = await sendPushToAll({
      title: data.titleRu || data.titleUz || data.titleEn,
      body: data.excerptRu || data.excerptUz || data.excerptEn || "MYTAX — yangi yangilik",
      url: `${site}/ru/news/${slug}`,
      image: coverImage,
      tag: slug,
    });
    pushed = `&pushed=${result.sent}`;
  }

  refreshPublicPages(slug);
  redirect(`/admin/articles?saved=1${pushed}`);
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

/* ---------------------------- статические страницы --------------------------- */

export type PageFormState = { error?: string };

/** Создание и правка страниц вида «О нас», «Контакты». */
export async function savePage(
  _prev: PageFormState,
  formData: FormData,
): Promise<PageFormState> {
  await requireSession();

  const id = String(formData.get("id") ?? "").trim();
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const titleRu = text("titleRu");
  const titleUz = text("titleUz");
  const titleEn = text("titleEn");
  if (!titleRu && !titleUz && !titleEn) {
    return { error: "Заголовок нужен хотя бы на одном языке." };
  }

  const data = {
    titleUz: titleUz || titleRu || titleEn,
    titleRu: titleRu || titleUz || titleEn,
    titleEn: titleEn || titleRu || titleUz,
    bodyUz: sanitizeHtml(text("bodyUz")),
    bodyRu: sanitizeHtml(text("bodyRu")),
    bodyEn: sanitizeHtml(text("bodyEn")),
    published: formData.get("published") === "on",
    position: Number(text("position")) || 0,
  };

  let slug: string;

  if (id) {
    const existing = await prisma.page.findUnique({ where: { id } });
    if (!existing) return { error: "Страница не найдена." };

    const requested = text("slug");
    slug =
      requested && requested !== existing.slug
        ? await uniqueSlug(requested, async (s) =>
            Boolean(await prisma.page.findFirst({ where: { slug: s, id: { not: id } } })),
          )
        : existing.slug;

    await prisma.page.update({ where: { id }, data: { ...data, slug } });
  } else {
    slug = await uniqueSlug(text("slug") || data.titleRu, async (s) =>
      Boolean(await prisma.page.findUnique({ where: { slug: s } })),
    );
    await prisma.page.create({ data: { ...data, slug } });
  }

  revalidatePath("/", "layout");
  for (const locale of ["uz", "ru", "en"]) {
    revalidatePath(`/${locale}/pages/${slug}`);
  }
  redirect("/admin/pages?saved=1");
}

export async function deletePage(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return;

  await prisma.page.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/admin/pages?deleted=1");
}

/* -------------------------------- медиафайлы ------------------------------- */

export async function deleteMedia(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return;

  await prisma.media.delete({ where: { id } });
  await removeFile(media.url);

  revalidatePath("/admin/media");
}

/* ------------------------------ пользователи ------------------------------ */

export type UserFormState = { error?: string; ok?: string };

const MIN_PASSWORD = 8;

/** Создание учётной записи редактора или второго администратора. */
export async function createUser(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "EDITOR";

  if (!name || !email) return { error: "Укажите имя и email." };
  if (!email.includes("@")) return { error: "Email указан неверно." };
  if (password.length < MIN_PASSWORD) {
    return { error: `Пароль должен быть не короче ${MIN_PASSWORD} символов.` };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Пользователь с таким email уже есть." };

  const bcrypt = await import("bcryptjs");
  await prisma.user.create({
    data: { name, email, role, password: await bcrypt.hash(password, 10) },
  });

  revalidatePath("/admin/users");
  return { ok: `Пользователь ${email} создан.` };
}

/** Смена пароля другому пользователю. */
export async function resetUserPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { error: `Пароль должен быть не короче ${MIN_PASSWORD} символов.` };
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return { error: "Пользователь не найден." };

  const bcrypt = await import("bcryptjs");
  await prisma.user.update({
    where: { id },
    data: { password: await bcrypt.hash(password, 10) },
  });

  revalidatePath("/admin/users");
  return { ok: `Пароль для ${user.email} изменён.` };
}

export async function deleteUser(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  if (id === session.sub) return; // себя не удаляем

  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;
  // последнего администратора не удаляем, иначе панель станет недоступной
  if (target.role === "ADMIN" && admins <= 1) return;

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}

/** Смена собственного пароля: доступна любой роли, требует текущий пароль. */
export async function changeOwnPassword(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const session = await requireSession();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  if (next.length < MIN_PASSWORD) {
    return { error: `Новый пароль должен быть не короче ${MIN_PASSWORD} символов.` };
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return { error: "Пользователь не найден." };

  const bcrypt = await import("bcryptjs");
  if (!(await bcrypt.compare(current, user.password))) {
    return { error: "Текущий пароль неверный." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(next, 10) },
  });

  return { ok: "Пароль изменён." };
}

/* --------------------------- настройки и соцсети --------------------------- */

export async function saveSettings(formData: FormData) {
  await requireAdmin();

  for (const { key } of SOCIAL_KEYS) {
    const value = String(formData.get(key) ?? "").trim();
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
}

/** Проверочное уведомление — приходит только тому, кто нажал. */
export async function sendTestPush(): Promise<void> {
  await requireAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  await sendPushToAll({
    title: "MYTAX — проверка уведомлений",
    body: "Так будет выглядеть уведомление о новой новости.",
    url: `${site}/ru`,
    tag: "mytax-test",
  });
  revalidatePath("/admin/settings");
}

/* ---------------------------- вопросы консультанту --------------------------- */

export async function toggleQuestionAnswered(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return;

  await prisma.question.update({
    where: { id },
    data: { answered: !question.answered },
  });
  revalidatePath("/admin/questions");
}

export async function deleteQuestion(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  await prisma.question.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/questions");
}
