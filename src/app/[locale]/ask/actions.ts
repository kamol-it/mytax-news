"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { clientIpFromHeaders } from "@/lib/client-ip";
import { isLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { newToken } from "@/lib/questions";
import { sendPushToAdmins } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

export type AskState = { error?: string; token?: string };

const MAX_BODY = 4000;

/**
 * Те же лимиты, что у /api/ask и /api/ask/[token]: server action — такая же
 * публичная точка входа, и без лимита через неё можно засыпать админку
 * вопросами и push-уведомлениями.
 */
async function limitByIp(prefix: string, limit: number, windowSeconds: number) {
  const ip = clientIpFromHeaders(await headers());
  return rateLimit(`${prefix}:${ip}`, limit, windowSeconds);
}

/** Первое обращение: создаёт ветку и возвращает её код. */
export async function submitQuestion(
  _prev: AskState,
  formData: FormData,
): Promise<AskState> {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const name = text("name").slice(0, 120);
  const contact = text("contact").slice(0, 160);
  const topic = text("topic").slice(0, 160);
  const body = text("body").slice(0, MAX_BODY);
  const rawLocale = text("locale");
  const locale = isLocale(rawLocale) ? rawLocale : "ru";

  if (!name || !contact || !body) {
    return { error: "Заполните имя, контакт и текст вопроса." };
  }
  if (body.length < 15) {
    return { error: "Опишите вопрос подробнее — минимум 15 символов." };
  }

  const limit = await limitByIp("ask", 5, 3600);
  if (!limit.allowed) {
    return { error: "Слишком много обращений. Попробуйте позже." };
  }

  const token = newToken();
  await prisma.question.create({
    data: {
      token,
      name,
      contact,
      topic,
      locale,
      lastMessageAt: new Date(),
      messages: { create: { author: "visitor", body, authorName: name } },
    },
  });

  await sendPushToAdmins({
    title: "Новый вопрос консультанту",
    body: `${name}: ${body.slice(0, 120)}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/questions`,
    tag: "mytax-question",
  });

  revalidatePath("/admin/questions");
  revalidatePath("/admin");
  return { token };
}

/** Сообщение посетителя в уже открытой ветке. */
export async function replyAsVisitor(
  _prev: AskState,
  formData: FormData,
): Promise<AskState> {
  const token = String(formData.get("token") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);

  if (!token) return { error: "Ветка не найдена." };
  if (body.length < 2) return { error: "Напишите сообщение." };

  const limit = await limitByIp("ask-msg", 30, 600);
  if (!limit.allowed) {
    return { error: "Слишком много сообщений. Попробуйте позже." };
  }

  const question = await prisma.question.findUnique({ where: { token } });
  if (!question) return { error: "Ветка не найдена." };
  if (question.closed) return { error: "Обращение закрыто." };

  await prisma.$transaction([
    prisma.questionMessage.create({
      data: {
        questionId: question.id,
        author: "visitor",
        body,
        authorName: question.name,
      },
    }),
    prisma.question.update({
      where: { id: question.id },
      data: { answered: false, lastMessageAt: new Date() },
    }),
  ]);

  await sendPushToAdmins({
    title: "Ответ посетителя в обращении",
    body: `${question.name}: ${body.slice(0, 120)}`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/questions`,
    tag: "mytax-question",
  });

  revalidatePath(`/${question.locale}/ask/${token}`);
  revalidatePath("/admin/questions");
  return { token };
}
