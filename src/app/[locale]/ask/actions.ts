"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { newToken } from "@/lib/questions";
import { sendPushToAdmins, sendPushToQuestion } from "@/lib/push";

export type AskState = { error?: string; token?: string };

const MAX_BODY = 4000;

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
  const locale = text("locale") || "ru";

  if (!name || !contact || !body) {
    return { error: "Заполните имя, контакт и текст вопроса." };
  }
  if (body.length < 15) {
    return { error: "Опишите вопрос подробнее — минимум 15 символов." };
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

/** Ответ консультанта из админки. */
export async function replyAsConsultant(
  questionId: string,
  authorName: string,
  body: string,
): Promise<void> {
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return;

  await prisma.$transaction([
    prisma.questionMessage.create({
      data: { questionId, author: "consultant", body, authorName },
    }),
    prisma.question.update({
      where: { id: questionId },
      data: { answered: true, lastMessageAt: new Date() },
    }),
  ]);

  if (question.token) {
    await sendPushToQuestion(question.token, {
      title: "MYTAX: есть ответ на ваш вопрос",
      body: body.slice(0, 140),
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${question.locale}/ask/${question.token}`,
      tag: `mytax-answer-${question.token}`,
    });
    revalidatePath(`/${question.locale}/ask/${question.token}`);
  }
}
