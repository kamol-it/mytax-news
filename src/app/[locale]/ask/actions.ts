"use server";

import { prisma } from "@/lib/prisma";

export type AskState = { error?: string; ok?: boolean };

const MAX_BODY = 4000;

/** Приём вопроса от посетителя. Ответ уходит на указанный контакт вручную. */
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

  // Простая защита от повторной отправки одного и того же вопроса
  const recent = await prisma.question.findFirst({
    where: { contact, body, createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) } },
  });
  if (recent) return { ok: true };

  await prisma.question.create({
    data: { name, contact, topic, body, locale },
  });

  return { ok: true };
}
